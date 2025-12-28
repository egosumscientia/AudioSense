"""
Simulador sencillo de ingestión en tiempo (casi) real.

Genera una medición cada INTERVAL_SECONDS (por defecto 5s) con valores
coherentes con una máquina industrial, guarda en measurements y resetea
la tabla cuando llega a 10 000 filas.
"""

import os
import random
import time
from datetime import datetime, timezone
from typing import Tuple

from sqlalchemy import text

from app.db import SessionLocal

MAX_ROWS = 10_000
INTERVAL_SECONDS = float(os.getenv("SIM_INTERVAL_SECONDS", "5"))
ANOMALY_RATE = float(os.getenv("SIM_ANOMALY_RATE", "0.05"))  # 5% anomalías
LOG_EVERY = int(os.getenv("SIM_LOG_EVERY", "1"))  # imprime cada N filas


def _sample_measurement() -> Tuple[float, float, str]:
    """Devuelve (value, frequency, status) simulando condiciones industriales."""
    if random.random() < ANOMALY_RATE:
        # Anomalía: amplitud alta o frecuencia inusual
        value = round(random.uniform(0.85, 1.15), 4)
        freq = random.randint(3200, 7200)
        status = "Anomalo"
    else:
        # Operación normal: niveles estables en rango típico
        value = round(random.uniform(0.35, 0.65), 4)
        # frecuencia fundamental entre 90-480 Hz con ligeras variaciones
        freq = int(random.gauss(240, 80))
        freq = max(60, min(freq, 1200))
        status = "OK"
    # Genera métricas derivadas simuladas para enriquecer el dashboard
    snr = round(20 * (value + 0.1), 2)
    flatness = round(random.uniform(0.05, 0.35), 3)
    bands = [-120.0, -120.0, -120.0, -120.0, -120.0]
    # Marca energía en la banda correspondiente a la frecuencia simulada
    if freq < 500:
        bands[0] = round(20 * random.random(), 1)
    elif freq < 1000:
        bands[1] = round(20 * random.random(), 1)
    elif freq < 4000:
        bands[2] = round(20 * random.random(), 1)
    elif freq < 8000:
        bands[3] = round(20 * random.random(), 1)
    else:
        bands[4] = round(20 * random.random(), 1)
    return value, freq, status, snr, flatness, bands


def _ensure_space(db):
    """Si alcanzamos MAX_ROWS, limpiamos measurements para empezar de nuevo."""
    current = db.execute(text("SELECT COUNT(*) FROM measurements")).scalar()
    if current and current >= MAX_ROWS:
        db.execute(text("DELETE FROM measurements"))
        db.commit()
        return True
    return False


def run_forever():
    """Bucle principal: genera y guarda una medición cada INTERVAL_SECONDS."""
    print(
        f"[sim] Iniciando simulador cada {INTERVAL_SECONDS}s, max filas {MAX_ROWS}, "
        f"anomaly rate {ANOMALY_RATE*100:.1f}%"
    )
    total_inserted = 0
    try:
        while True:
            with SessionLocal() as db:
                reset = _ensure_space(db)
                if reset:
                    print("[sim] Tabla measurements alcanzó el límite; limpiada y reiniciada.")
                value, freq, status, snr, flatness, bands = _sample_measurement()
                db.execute(
                    text(
                        """
                        INSERT INTO measurements (timestamp, value, frequency, status)
                        VALUES (:ts, :value, :freq, :status)
                        """
                    ),
                    {
                        "ts": datetime.now(timezone.utc),
                        "value": value,
                        "freq": freq,
                        "status": status,
                    },
                )
                db.commit()
                total_inserted += 1
                if total_inserted % LOG_EVERY == 0:
                    print(
                        f"[sim] +1 fila (total {total_inserted}): status={status}, "
                        f"value={value}, freq={freq} Hz"
                    )
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\n[sim] Detenido por usuario.")


if __name__ == "__main__":
    run_forever()
