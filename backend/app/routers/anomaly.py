from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.utils import model_loader

router = APIRouter(prefix="/anomaly", tags=["Model"])


@router.get("/stream")
def analyze_stream(db: Session = Depends(get_db)):
    """
    Evalúa la última ventana de mediciones usando el modelo entrenado (IsolationForest).
    Devuelve el puntaje de anomalía y estado.
    """
    result = model_loader.score_recent_window(db)
    return result
