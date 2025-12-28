from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.utils import model_loader
from app.utils.train_if import train_and_save
from app.utils.features import DEFAULT_WINDOW_SIZE

router = APIRouter(prefix="/anomaly", tags=["Model"])


@router.get("/stream")
def analyze_stream(db: Session = Depends(get_db)):
    """
    Evalúa la última ventana de mediciones usando el modelo entrenado (IsolationForest).
    Devuelve el puntaje de anomalía y estado.
    """
    result = model_loader.score_recent_window(db)
    return result


@router.post("/train")
def train_model(window_size: int = None, threshold_pct: float | None = None):
    """
    Entrena y guarda el modelo IsolationForest con las muestras actuales.
    """
    try:
        bundle = train_and_save(
            window_size=window_size or DEFAULT_WINDOW_SIZE,
            threshold_pct=threshold_pct,
        )
        # recarga modelo en cache
        model_loader.load_model()
        return {
            "success": True,
            "message": "Modelo entrenado y guardado",
            "window_size": bundle.get("window_size"),
            "threshold": bundle.get("threshold"),
            "threshold_pct": bundle.get("threshold_pct"),
            "score_mean": bundle.get("score_mean"),
            "score_std": bundle.get("score_std"),
            "train_windows": bundle.get("train_windows"),
            "train_samples": bundle.get("train_samples"),
            "note": bundle.get("note", ""),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
