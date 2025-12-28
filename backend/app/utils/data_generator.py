import random
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Analysis

NORMAL_RANGES = {"amplitude": (0.2, 0.6), "frequency": (800, 2000)}
ANOMALY_RANGES = {"amplitude": (0.8, 1.2), "frequency": (2000, 6000)}

def generate_fake_analysis(normal=True):
    ranges = NORMAL_RANGES if normal else ANOMALY_RANGES
    data = {
        "amplitude": round(random.uniform(*ranges["amplitude"]), 3),
        "frequency": round(random.uniform(*ranges["frequency"]), 1),
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

###
from sqlalchemy.orm import Session
from app.models import Measurement
import random, json
from datetime import datetime

def populate_measurements(db: Session, n: int = 10_000):
    """Inserta n mediciones simuladas directamente en PostgreSQL."""
    rows = []
    for _ in range(n):
        value = round(random.uniform(0.0, 1.0), 4)
        freq = random.randint(100, 5000)
        rows.append({
            "timestamp": datetime.utcnow(),
            "value": value,
            "frequency": freq,
            "status": "OK" if value < 0.8 else "Anómalo"
        })
    db.bulk_insert_mappings(Measurement, rows)
    db.commit()
