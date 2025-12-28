"""
Entrenamiento rápido de un detector de anomalías basado en IsolationForest
usando series simuladas (value, frequency, status) de la tabla measurements.

Requiere: scikit-learn, joblib.
"""

import os
from pathlib import Path
from typing import Dict, List

import numpy as np
import joblib
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


def train_model(records: List[Dict], window_size: int, threshold_pct: float) -> Dict:
    feature_rows = build_feature_matrix(records, window_size=window_size, include_anom_rate=True)
    if not feature_rows:
        raise RuntimeError(f"No hay suficientes datos para ventana={window_size}")

    # Entrena solo con ventanas sin anomalías declaradas (anom_rate == 0)
    clean_rows = [r for r in feature_rows if r.get("anom_rate", 0.0) == 0.0]
    note = ""
    if not clean_rows:
        # Relaja criterio: usa ventanas con tasa de anomalías <=10%
        clean_rows = [r for r in feature_rows if r.get("anom_rate", 0.0) <= 0.1]
        note = "Se usaron ventanas con <=10% anomalías por falta de ventanas 100% normales."
    if not clean_rows:
        # Último recurso: usa las 25% ventanas con menor anom_rate
        sorted_rows = sorted(feature_rows, key=lambda r: r.get("anom_rate", 1.0))
        cutoff = max(1, int(len(sorted_rows) * 0.25))
        clean_rows = sorted_rows[:cutoff]
        note = "Se usaron las ventanas con menor tasa de anomalías (fallback)."
    if not clean_rows:
        raise RuntimeError("No hay ventanas utilizables para entrenar")

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

    # score_samples: valores más pequeños = más anómalos
    scores = model.score_samples(X)
    threshold = float(np.percentile(scores, threshold_pct))

    return {
        "model": model,
        "scaler": scaler,
        "threshold": threshold,
        "threshold_pct": threshold_pct,
        "score_mean": float(np.mean(scores)),
        "score_std": float(np.std(scores)),
        "feature_names": feature_names,
        "window_size": window_size,
        "train_windows": len(clean_rows),
        "train_samples": len(records),
        "note": note,
    }


def train_and_save(window_size: int = DEFAULT_WINDOW_SIZE, threshold_pct: float = None) -> Dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    pct = float(threshold_pct) if threshold_pct is not None else float(os.getenv("MODEL_THRESHOLD_PCT", "5"))
    with SessionLocal() as session:
        records = fetch_measurements(session)
    effective_window = min(window_size or DEFAULT_WINDOW_SIZE, len(records))
    if effective_window < 10:
        raise RuntimeError(f"Datos insuficientes: {len(records)} muestras, se necesitan >= 10")
    bundle = train_model(records, window_size=effective_window, threshold_pct=pct)
    joblib.dump(bundle, MODEL_PATH)
    return bundle


def main(window_size: int = DEFAULT_WINDOW_SIZE, threshold_pct: float = None):
    bundle = train_and_save(window_size=window_size, threshold_pct=threshold_pct)
    print(f"[train_if] Modelo guardado en {MODEL_PATH} | ventanas entrenadas: {bundle['train_windows']}")


if __name__ == "__main__":
    main()
