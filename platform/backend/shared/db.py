import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_MODE = os.getenv("DB_MODE", "local").lower()
LOCAL_SQLITE_URL = os.getenv("LOCAL_DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'orbit.db')}")

def get_database_url() -> str:
    if DB_MODE == "remote":
        url = os.getenv("DATABASE_URL", "postgresql+psycopg://localhost/eip_db")
        if any(p in url for p in ["user:password@host", "your-project", "@localhost/eip_db"]):
            return LOCAL_SQLITE_URL
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        return url
    return LOCAL_SQLITE_URL

DATABASE_URL = get_database_url()

try:
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning(f"Failed to connect to primary DB ({DATABASE_URL}), falling back to local SQLite: {e}")
    DATABASE_URL = LOCAL_SQLITE_URL
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

