"""
Entrenamiento rápido de un detector de anomalías basado en IsolationForest
usando series simuladas (value, frequency, status) de la tabla measurements.

Requiere: scikit-learn, joblib.
"""

import os
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
from sqlalchemy import text

from app.db import SessionLocal
from app.utils.features import DEFAULT_WINDOW_SIZE, build_feature_matrix
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


MODEL_DIR = Path(__file__).resolve().parent.parent / "models_store"
MODEL_PATH = MODEL_DIR / "model_if.pkl"


def fetch_measurements(session) -> List[Dict]:
    rows = (
        session.execute(
            text("SELECT timestamp, value, frequency, status FROM measurements ORDER BY timestamp")
        )
        .mappings()
        .all()
    )
    return [dict(r) for r in rows]


def train_model(records: List[Dict], window_size: int) -> Dict:
    feature_rows = build_feature_matrix(records, window_size=window_size, include_anom_rate=True)
    if not feature_rows:
        raise RuntimeError(f"No hay suficientes datos para ventana={window_size}")

    # Entrena solo con ventanas sin anomalías declaradas (anom_rate == 0)
    clean_rows = [r for r in feature_rows if r.get("anom_rate", 0.0) == 0.0]
    if not clean_rows:
        raise RuntimeError("No hay ventanas totalmente normales para entrenar")

    feature_names = [k for k in clean_rows[0].keys() if k != "anom_rate"]
    X_raw = np.asarray([[float(r.get(k, 0.0)) for k in feature_names] for r in clean_rows], dtype=float)

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    model = IsolationForest(
        n_estimators=int(os.getenv("MODEL_TREES", "200")),
        contamination=float(os.getenv("MODEL_CONTAMINATION", "0.05")),
        random_state=42,
    )
    model.fit(X)

    scores = model.decision_function(X)
    threshold = float(np.percentile(scores, 5))  # umbral sensible; ajustable

    return {
        "model": model,
        "scaler": scaler,
        "threshold": threshold,
        "feature_names": feature_names,
        "window_size": window_size,
        "train_windows": len(clean_rows),
        "train_samples": len(records),
    }


def main(window_size: int = DEFAULT_WINDOW_SIZE):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with SessionLocal() as session:
        records = fetch_measurements(session)

    if len(records) < window_size:
        raise RuntimeError(f"Datos insuficientes: {len(records)} muestras, se necesitan >= {window_size}")

    bundle = train_model(records, window_size=window_size)
    joblib.dump(bundle, MODEL_PATH)
    print(f"[train_if] Modelo guardado en {MODEL_PATH} | ventanas entrenadas: {bundle['train_windows']}")


if __name__ == "__main__":
    main()
