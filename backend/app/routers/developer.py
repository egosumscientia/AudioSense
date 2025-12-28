from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
from pathlib import Path

from app.db import get_db
from app.utils.model_loader import load_model
from app.utils.train_if import train_and_save
from app.utils.features import DEFAULT_WINDOW_SIZE

router = APIRouter(prefix="/v2", tags=["Developer Mode"])


@router.post("/generate")
def generate_data(db: Session = Depends(get_db)):
    """Genera 10 000 mediciones simuladas en PostgreSQL/SQLite."""
    from app.utils.data_generator import populate_measurements
    from sqlalchemy import text

    db.execute(text("DELETE FROM measurements"))
    db.commit()

    populate_measurements(db, n=10_000)

    return {"message": "Se generaron 10 000 mediciones"}


@router.post("/train")
def train_model(window_size: int | None = None, threshold_pct: float | None = None):
    """
    Entrena y guarda el modelo IsolationForest (fuente única de inferencia).
    """
    bundle = train_and_save(
        window_size=window_size or DEFAULT_WINDOW_SIZE,
        threshold_pct=threshold_pct,
    )
    # recarga en cache por si estaba vacío
    load_model()
    return {
        "message": "Modelo IsolationForest entrenado",
        "window_size": bundle.get("window_size"),
        "threshold": bundle.get("threshold"),
        "threshold_pct": bundle.get("threshold_pct"),
        "train_windows": bundle.get("train_windows"),
        "train_samples": bundle.get("train_samples"),
        "note": bundle.get("note", ""),
    }


@router.post("/update")
def update_results():
    """
    Ruta mantenida por compatibilidad. El modelo válido es IsolationForest;
    usa /anomaly/stream para consultar puntaje en tiempo real.
    """
    return {
        "message": "Modelo único: IsolationForest. Usa /anomaly/train para entrenar y /anomaly/stream para puntuar.",
        "deprecated": True,
    }


@router.post("/clear")
def clear_database(db: Session = Depends(get_db)):
    """Limpia tablas measurements y models, y borra el archivo del modelo IF."""
    from sqlalchemy import text
    db.execute(text("DELETE FROM measurements"))
    db.execute(text("DELETE FROM models"))
    db.commit()

    model_path = Path(__file__).resolve().parent.parent / "models_store" / "model_if.pkl"
    if model_path.exists():
        os.remove(model_path)

    return {"message": "Datos limpiados y modelo IsolationForest eliminado"}
