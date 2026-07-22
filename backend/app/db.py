import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger("dsa_patterns_tracker")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./dsa_tracker.db"

engine_kwargs = {}
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs["pool_pre_ping"] = True
    if "render.com" in DATABASE_URL or "neon.tech" in DATABASE_URL:
        engine_kwargs["connect_args"] = {"sslmode": "require"}
elif DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    # Test connection if postgres
    if DATABASE_URL.startswith("postgresql"):
        with engine.connect() as conn:
            pass
except Exception as e:
    logger.warning("PostgreSQL connection failed (%s), falling back to SQLite", e)
    DATABASE_URL = "sqlite:///./dsa_tracker.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session and always closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

