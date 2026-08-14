import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

raw_url = os.getenv("DATABASE_URL", "sqlite:///./orbit.db")
is_placeholder = any(p in raw_url for p in ["user:password@host", "your-project", "@localhost/eip_db"])

if is_placeholder:
    DATABASE_URL = "sqlite:///./orbit.db"
elif raw_url.startswith("postgresql://") or raw_url.startswith("postgres://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg://", 1).replace("postgres://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = raw_url

try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning(f"Failed to connect to primary DB ({DATABASE_URL}), falling back to SQLite: {e}")
    DATABASE_URL = "sqlite:///./orbit.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

