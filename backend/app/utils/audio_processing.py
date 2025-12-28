import librosa
import numpy as np
import tempfile
import os
from scipy import signal
from typing import List, Dict, Any

def apply_band_filter(y, sr, lowcut, highcut, order=5):
    """Aplica un filtro Butterworth de banda pasante."""
    nyq = 0.5 * sr
    low = lowcut / nyq
    high = highcut / nyq
    b, a = signal.butter(order, [low, high], btype='band')
    return signal.lfilter(b, a, y)

def analyze_window(y_window, sr):
    """Analiza un segmento corto de audio (ventana)."""
    # FFT
    spectrum = np.abs(np.fft.rfft(y_window))
    freqs = np.fft.rfftfreq(len(y_window), 1 / sr)
    dominant_freq = float(freqs[np.argmax(spectrum)])
    
    # Metricas
    rms = float(np.mean(librosa.feature.rms(y=y_window)))
    rms_db = round(rms * 100, 1)
    
    # Flatness
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y_window)))
    
    return {
        "rms_db": rms_db,
        "dominant_hz": int(dominant_freq),
        "flatness": round(flatness, 3)
    }

async def analyze_audio(file, machine_type: str = "generic"):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Cargar y normalizar
        y, sr = librosa.load(tmp_path, sr=None)
        y = librosa.util.normalize(y)

        # 1. Análisis Global
        spectrum_full = np.abs(np.fft.rfft(y))
        freqs_full = np.fft.rfftfreq(len(y), 1 / sr)
        dominant_freq_global = float(freqs_full[np.argmax(spectrum_full)])

        # 2. Análisis por Ventanas (Segmentación)
        win_length = int(0.5 * sr)
        hop_length = int(win_length / 2)
        
        if len(y) < win_length:
            win_length = len(y)
            hop_length = len(y)

        windows_data = []
        for i in range(0, len(y) - win_length + 1, hop_length):
            segment = y[i : i + win_length]
            w_res = analyze_window(segment, sr)
            windows_data.append(w_res)

        # 3. Filtrado por bandas específicas según tipo de máquina
        profile_data = {}
        if machine_type == "motor":
            # Motores suelen fallar en bajas-medias (50-2000 Hz)
            y_filt = apply_band_filter(y, sr, 50, 2000)
            rms_filt = float(np.mean(librosa.feature.rms(y=y_filt)))
            profile_data = {"profile": "motor", "band_rms_db": round(rms_filt * 100, 1)}
        elif machine_type == "compressor":
            # Compresores operan a altas presiones, bandas altas (2000-8000 Hz)
            y_filt = apply_band_filter(y, sr, 2000, 8000)
            rms_filt = float(np.mean(librosa.feature.rms(y=y_filt)))
            profile_data = {"profile": "compressor", "band_rms_db": round(rms_filt * 100, 1)}

        # 4. Metricas Globales para compatibilidad
        rms_global = float(np.mean(librosa.feature.rms(y=y)))
        snr_global = float(10 * np.log10(np.mean(y**2) / (np.mean((y - np.mean(y))**2) + 1e-10)))
        flatness_global = float(np.mean(librosa.feature.spectral_flatness(y=y)))
        crest_global = float(np.max(np.abs(y)) / np.sqrt(np.mean(y**2)))

        # 5. Energia por banda (dB)
        bands = [0, 500, 1000, 4000, 8000, 12000]
        band_levels = []
        for i in range(len(bands) - 1):
            idx = np.where((freqs_full >= bands[i]) & (freqs_full < bands[i + 1]))[0]
            if len(idx) > 0:
                energy = float(np.mean(spectrum_full[idx]))
                band_levels.append(round(20 * np.log10(energy + 1e-6), 1))
            else:
                band_levels.append(-120.0)

        # 6. Heurística de anomalía multiventana + perfil
        reasons = []
        
        # Evaluar ventanas individuales
        found_transient = False
        for idx, w in enumerate(windows_data):
            if w["rms_db"] > 90:
                reasons.append(f"pico de nivel en ventana {idx}")
                found_transient = True
            if w["dominant_hz"] > 8500:
                reasons.append(f"alta frecuencia en ventana {idx}")
                found_transient = True
            if found_transient: break

        # Evaluacion por perfil
        if profile_data.get("band_rms_db", 0) > 70:
            reasons.append(f"nivel critico en banda de {machine_type}")

        # Heurísticas globales
        rms_db = round(rms_global * 100, 1)
        snr_db = round(snr_global, 2)
        flatness_r = round(flatness_global, 3)
        crest_r = round(crest_global, 2)
        dominant_hz = int(dominant_freq_global)

        if not found_transient:
            if dominant_hz < 50: reasons.append("frecuencia global demasiado baja")
            if flatness_r > 0.25: reasons.append("flatness global alta")
            if snr_db < -3 and rms_db < 10: reasons.append("SNR global muy bajo")
            if crest_r > 6: reasons.append("crest factor global alto")

        anomaly = len(reasons) > 0
        estado = "Anomalo" if anomaly else "Normal"
        mensaje = "; ".join(reasons) if anomaly else "Sin anomalias detectadas"
        confianza = 80.0 if anomaly else 95.0

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
            "machine_profile": profile_data,
            "windowed_analysis": windows_data
        }

    finally:
        os.remove(tmp_path)
