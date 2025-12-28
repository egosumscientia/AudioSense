from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .db import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    rms_db = Column(Float)
    dominant_freq_hz = Column(Float)
    confidence_percent = Column(Float)
    status = Column(String)
    mensaje = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    value = Column(Float, nullable=False)
    frequency = Column(Float)
    status = Column(String)

class Model(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mean_value = Column(Float)
    mean_freq = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
