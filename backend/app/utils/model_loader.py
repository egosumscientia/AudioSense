import threading
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.utils.features import DEFAULT_WINDOW_SIZE, compute_window_features, ensure_feature_vector

MODEL_PATH = Path(__file__).resolve().parent.parent / "models_store" / "model_if.pkl"
_lock = threading.Lock()
_cached_model: Optional[Dict] = None


def load_model(path: Path = MODEL_PATH) -> Optional[Dict]:
    global _cached_model
    if not path.exists():
        _cached_model = None
        return None
    with _lock:
        _cached_model = joblib.load(path)
    return _cached_model


def get_model() -> Optional[Dict]:
    global _cached_model
    if _cached_model is None:
        return load_model()
    return _cached_model


def _fetch_recent_measurements(session: Session, window_size: int) -> Optional[list]:
    rows = (
        session.execute(
            text(
                "SELECT timestamp, value, frequency, status "
                "FROM measurements ORDER BY timestamp DESC LIMIT :n"
            ),
            {"n": window_size},
        )
        .mappings()
        .all()
    )
    if len(rows) < window_size:
        return None
    # revertimos a orden cronologico
    return list(reversed([dict(r) for r in rows]))


def score_recent_window(session: Optional[Session] = None) -> Dict:
    model_bundle = get_model()
    if not model_bundle:
        return {"detail": "Modelo no cargado. Entrena y guarda model_if.pkl primero."}

    window_size = int(model_bundle.get("window_size", DEFAULT_WINDOW_SIZE))
    own_session = False
    if session is None:
        own_session = True
        session = SessionLocal()

    try:
        records = _fetch_recent_measurements(session, window_size)
    finally:
        if own_session:
            session.close()

    if not records:
        return {"detail": f"Datos insuficientes para ventana de {window_size} muestras."}

    feats = compute_window_features(records)
    feature_vector = ensure_feature_vector(feats, model_bundle["feature_names"])
    X = model_bundle["scaler"].transform(feature_vector)
    # score_samples: valores m s pequeños = m s anómalos (consistente con threshold entrenado)
    score = float(model_bundle["model"].score_samples(X)[0])
    threshold = float(model_bundle["threshold"])
    is_anomaly = score < threshold
    margin = score - threshold
    mean = float(model_bundle.get("score_mean", 0.0))
    std = float(model_bundle.get("score_std", 1.0)) or 1.0
    z_score = (score - mean) / std

    return {
        "status": "Anomalo" if is_anomaly else "OK",
        "anomaly_score": score,
        "threshold": threshold,
        "margin": margin,
        "score_mean": mean,
        "score_std": std,
        "z_score": z_score,
        "threshold_pct": model_bundle.get("threshold_pct"),
        "window_size": window_size,
        "detail": None,
    }
