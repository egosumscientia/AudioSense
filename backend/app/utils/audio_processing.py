import librosa
import numpy as np
import tempfile
import os


async def analyze_audio(file):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Cargar y normalizar
        y, sr = librosa.load(tmp_path, sr=None)
        y = librosa.util.normalize(y)

        # FFT basica
        spectrum = np.abs(np.fft.rfft(y))
        freqs = np.fft.rfftfreq(len(y), 1 / sr)
        dominant_freq = float(freqs[np.argmax(spectrum)])

        # Metricas simples
        rms = float(np.mean(librosa.feature.rms(y=y)))
        snr = float(10 * np.log10(np.mean(y**2) / (np.mean((y - np.mean(y))**2) + 1e-10)))
        flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
        crest = float(np.max(np.abs(y)) / np.sqrt(np.mean(y**2)))

        # Energia por banda (dB)
        bands = [0, 500, 1000, 4000, 8000, 12000]
        band_levels = []
        for i in range(len(bands) - 1):
            idx = np.where((freqs >= bands[i]) & (freqs < bands[i + 1]))[0]
            if len(idx) > 0:
                energy = float(np.mean(spectrum[idx]))
                band_levels.append(round(20 * np.log10(energy + 1e-6), 1))
            else:
                band_levels.append(-120.0)

        # Regla simple de anomalía (heurística endurecida)
        rms_db = round(rms * 100, 1)
        snr_db = round(snr, 2)
        flatness_r = round(flatness, 3)
        crest_r = round(crest, 2)
        dominant_hz = int(dominant_freq)

        reasons = []
        if dominant_hz < 50:
            reasons.append("frecuencia demasiado baja")
        if dominant_hz > 8500:
            reasons.append("frecuencia demasiado alta")
        if flatness_r > 0.25:
            reasons.append("flatness alta")
        # SNR bajo solo si además hay nivel muy bajo
        if snr_db < -3 and rms_db < 10:
            reasons.append("SNR muy bajo")
        if rms_db < 1 or rms_db > 90:
            reasons.append("nivel RMS fuera de rango")
        if crest_r > 6:
            reasons.append("crest factor alto")

        anomaly = len(reasons) > 0
        estado = "Anomalo" if anomaly else "Normal"
        mensaje = "; ".join(reasons) if anomaly else "Sin anomalias detectadas"
        confianza = 80.0 if anomaly else 95.0

        # Devolver resultado con solo tipos nativos de Python
        return {
            "rms_db": rms_db,
            "dominant_freq_hz": dominant_hz,
            "confidence_percent": float(confianza),
            "status": estado,
            "mensaje": mensaje,
            "snr_db": snr_db,
            "flatness": flatness_r,
            "crest_factor": crest_r,
            "band_levels": [float(x) for x in band_levels],
            "filename": file.filename,
        }

    finally:
        os.remove(tmp_path)
