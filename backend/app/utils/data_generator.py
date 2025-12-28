import random
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Analysis, Measurement

NORMAL_RANGES = {"amplitude": (0.2, 0.6), "frequency": (800, 2000)}
ANOMALY_RANGES = {"amplitude": (0.8, 1.2), "frequency": (2000, 6000)}


def generate_fake_analysis(normal: bool = True):
    ranges = NORMAL_RANGES if normal else ANOMALY_RANGES
    # Usamos distribución gaussiana para mayor realismo (centrada en el rango)
    mu_amp = sum(ranges["amplitude"]) / 2
    sigma_amp = (ranges["amplitude"][1] - ranges["amplitude"][0]) / 4
    
    mu_freq = sum(ranges["frequency"]) / 2
    sigma_freq = (ranges["frequency"][1] - ranges["frequency"][0]) / 4

    amplitude = max(0.01, random.gauss(mu_amp, sigma_amp))
    frequency = max(20, random.gauss(mu_freq, sigma_freq))

    data = {
        "amplitude": round(amplitude, 3),
        "frequency": round(frequency, 1),
    }
    return {
        "name": f"{'Normal' if normal else 'Anomalous'} signal",
        "description": "Synthetic test sample",
        "result": json.dumps(data),
        "created_at": datetime.utcnow(),
    }


def populate_fake_data(db: Session, n: int = 100):
    for _ in range(n):
        entry = generate_fake_analysis(normal=random.random() > 0.3)
        db.add(Analysis(**entry))
    db.commit()


def populate_measurements(db: Session, n: int = 10_000):
    """Inserta n mediciones simuladas usando rangos físicos consistentes."""
    rows = []
    for _ in range(n):
        is_normal = random.random() > 0.05  # 5% de anomalías por defecto
        ranges = NORMAL_RANGES if is_normal else ANOMALY_RANGES
        
        mu_amp = sum(ranges["amplitude"]) / 2
        sigma_amp = (ranges["amplitude"][1] - ranges["amplitude"][0]) / 6
        
        mu_freq = sum(ranges["frequency"]) / 2
        sigma_freq = (ranges["frequency"][1] - ranges["frequency"][0]) / 6

        value = max(0.01, random.gauss(mu_amp, sigma_amp))
        freq = max(20, random.gauss(mu_freq, sigma_freq))

        rows.append(
            {
                "timestamp": datetime.utcnow(),
                "value": round(value, 4),
                "frequency": round(freq, 1),
                "status": "OK" if is_normal else "Anomalo",
            }
        )
    db.bulk_insert_mappings(Measurement, rows)
    db.commit()
