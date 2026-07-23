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


def init_db():
    """Ensure all tables and columns exist dynamically on startup or seeding."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "users" in tables:
            existing_cols = {col["name"] for col in inspector.get_columns("users")}
            user_cols = [
                ("username", "VARCHAR(100)"),
                ("email", "VARCHAR(255)"),
                ("password_hash", "VARCHAR(255)"),
                ("avatar_url", "VARCHAR(500)"),
                ("github_username", "VARCHAR(100)"),
                ("leetcode_username", "VARCHAR(100)"),
                ("gfg_username", "VARCHAR(100)"),
                ("auth_provider", "VARCHAR(50) DEFAULT 'email'"),
                ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
            ]
            with engine.begin() as conn:
                for col_name, col_type in user_cols:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                            logger.info("Added missing column '%s' to 'users' table.", col_name)
                        except Exception as exc:
                            logger.warning("Could not add column '%s' to 'users': %s", col_name, exc)

        if "user_progress" in tables:
            existing_cols = {col["name"] for col in inspector.get_columns("user_progress")}
            up_cols = [
                ("submitted_code", "TEXT"),
                ("submitted_language", "VARCHAR(50)"),
                ("last_submitted_at", "TIMESTAMP WITH TIME ZONE"),
            ]
            with engine.begin() as conn:
                for col_name, col_type in up_cols:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE user_progress ADD COLUMN {col_name} {col_type}"))
                            logger.info("Added missing column '%s' to 'user_progress' table.", col_name)
                        except Exception as exc:
                            logger.warning("Could not add column '%s' to 'user_progress': %s", col_name, exc)

        if "problems" in tables:
            existing_cols = {col["name"] for col in inspector.get_columns("problems")}
            prob_cols = [
                ("guide_hints_json", "TEXT"),
                ("guide_explanation", "TEXT"),
                ("guide_python", "TEXT"),
                ("guide_javascript", "TEXT"),
            ]
            with engine.begin() as conn:
                for col_name, col_type in prob_cols:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE problems ADD COLUMN {col_name} {col_type}"))
                            logger.info("Added missing column '%s' to 'problems' table.", col_name)
                        except Exception as exc:
                            logger.warning("Could not add column '%s' to 'problems': %s", col_name, exc)

        if "patterns" in tables:
            existing_cols = {col["name"] for col in inspector.get_columns("patterns")}
            if "track_category" not in existing_cols:
                with engine.begin() as conn:
                    try:
                        conn.execute(text("ALTER TABLE patterns ADD COLUMN track_category VARCHAR(50) DEFAULT 'dsa'"))
                        logger.info("Added missing column 'track_category' to 'patterns' table.")
                    except Exception as exc:
                        logger.warning("Could not add column 'track_category' to 'patterns': %s", exc)

    except Exception as exc:
        logger.warning("Database schema check encountered non-fatal error: %s", exc)

    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency: yields a DB session and always closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
