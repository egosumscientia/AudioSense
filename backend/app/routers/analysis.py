from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/analyses", tags=["Analyses"])

@router.get("/")
def read_measurements(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    """
    Devuelve los datos reales de la tabla measurements para el dashboard.
    """
    query = db.execute(text("""
        SELECT
            id,
            timestamp,
            value AS rms_db,
            frequency AS dominant_freq_hz,
            status
        FROM measurements
        ORDER BY timestamp ASC
        OFFSET :skip LIMIT :limit
    """), {"skip": skip, "limit": limit})

    rows = [dict(row._mapping) for row in query]
    return rows
