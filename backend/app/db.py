from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

class Base(DeclarativeBase):
    pass

load_dotenv()  # lee las variables del archivo .env

# Si no hay DATABASE_URL, usamos SQLite local para desarrollo rápido
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from app import models

# Crear todas las tablas definidas en models.py
models.Base.metadata.create_all(bind=engine)
