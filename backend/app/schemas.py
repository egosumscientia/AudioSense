from pydantic import BaseModel
from datetime import datetime


# -------------------------------------------------------------------
# Esquema base: campos técnicos del análisis de audio
# -------------------------------------------------------------------
class AnalysisBase(BaseModel):
    filename: str
    rms_db: float
    dominant_freq_hz: float
    confidence_percent: float
    status: str
    mensaje: str


# -------------------------------------------------------------------
# Esquema de creación (entrada POST)
# -------------------------------------------------------------------
class AnalysisCreate(AnalysisBase):
    pass


# -------------------------------------------------------------------
# Esquema de salida para endpoints /analyses y /analyses/{id}
# -------------------------------------------------------------------
class Analysis(AnalysisBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
