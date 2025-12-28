from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

class Base(DeclarativeBase):
    pass

load_dotenv()  # lee las variables del archivo .env

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
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
