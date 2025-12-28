from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import get_db

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
def train_model(db: Session = Depends(get_db)):
    """Entrena un modelo basico con las mediciones actuales."""
    from sqlalchemy import text

    result = db.execute(text("SELECT AVG(value), AVG(frequency) FROM measurements")).fetchone()
    avg_val, avg_freq = result if result else (0, 0)

    db.execute(
        text("INSERT INTO models (name, mean_value, mean_freq, created_at) VALUES (:n, :v, :f, :ts)"),
        {"n": "modelo_promedio", "v": avg_val, "f": avg_freq, "ts": datetime.utcnow()},
    )
    db.commit()

    return {"message": "Modelo entrenado", "mean_value": avg_val, "mean_freq": avg_freq}


@router.post("/update")
def update_results(db: Session = Depends(get_db)):
    """Actualiza status en measurements segun el modelo mas reciente."""
    from sqlalchemy import text

    model = db.execute(
        text("SELECT mean_value, mean_freq FROM models ORDER BY created_at DESC LIMIT 1")
    ).fetchone()
    if not model:
        return {"message": "No hay modelo entrenado"}

    mean_val, mean_freq = model
    db.execute(
        text("""
        UPDATE measurements
        SET status = CASE
            WHEN ABS(value - :v) > 0.2 OR ABS(frequency - :f) > 500 THEN 'Anomalo'
            ELSE 'OK' END
        """),
        {"v": mean_val, "f": mean_freq},
    )
    db.commit()

    return {"message": "Resultados actualizados"}


@router.post("/clear")
def clear_database(db: Session = Depends(get_db)):
    """Limpia tablas measurements y models."""
    from sqlalchemy import text
    db.execute(text("DELETE FROM measurements"))
    db.execute(text("DELETE FROM models"))
    db.commit()
    return {"message": "Tablas limpiadas correctamente"}
