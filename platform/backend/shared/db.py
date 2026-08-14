import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_MODE = os.getenv("DB_MODE", "local").lower()


def get_database_url() -> str:
    if DB_MODE == "remote":
        url = os.getenv("DATABASE_URL", "postgresql+psycopg://localhost/eip_db")
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        return url
    return os.getenv("LOCAL_DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'orbit.db')}")

DATABASE_URL = get_database_url()
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
