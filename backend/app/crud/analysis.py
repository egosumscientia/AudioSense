from sqlalchemy.orm import Session
from app.models import Analysis
from app.schemas import AnalysisCreate

def get_analyses(db: Session, skip: int = 0, limit: int = 100):
    """Devuelve una lista de análisis almacenados."""
    return db.query(Analysis).offset(skip).limit(limit).all()

def get_analysis(db: Session, analysis_id: int):
    """Devuelve un análisis por su ID."""
    return db.query(Analysis).filter(Analysis.id == analysis_id).first()

def create_analysis(db: Session, analysis: AnalysisCreate):
    """Crea un nuevo registro de análisis."""
    db_analysis = Analysis(**analysis.dict())
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis
