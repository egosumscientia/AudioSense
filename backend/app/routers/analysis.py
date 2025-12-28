from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/analyses", tags=["Analyses"])

@router.get("/")
def read_measurements(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    """
    Devuelve los datos reales de la tabla measurements para el dashboard.
    Obtiene los ùltimos registros y los reordena cronol¢gicamente.
    """
    query = db.execute(
        text(
            """
            SELECT
                id,
                timestamp,
                value AS rms_db,
                frequency AS dominant_freq_hz,
                status
            FROM measurements
            ORDER BY timestamp DESC
            OFFSET :skip LIMIT :limit
            """
        ),
        {"skip": skip, "limit": limit},
    )

    # Devuelve cronol¢gico ascendente para el chart
    rows = [dict(row._mapping) for row in query][::-1]
    return rows


@router.get("/logs")
def stream_logs(limit: int = 200, db: Session = Depends(get_db)):
    """
    Devuelve las ùltimas filas de measurements en orden descendente (log en vivo).
    """
    query = db.execute(
        text(
            """
            SELECT
                timestamp,
                value,
                frequency,
                status
            FROM measurements
            ORDER BY timestamp DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    rows = [dict(row._mapping) for row in query]
    return rows
