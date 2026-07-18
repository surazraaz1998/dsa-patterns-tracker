import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routes import patterns
from app.seed_data import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dsa_patterns_tracker")

app = FastAPI(title="DSA Patterns Tracker API")

# Allow the local development frontend and deployed Vercel frontend to call this API.
allowed_origins = [
    "http://localhost:5173",
    "https://frontend-liard-iota-97.vercel.app",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(patterns.router)


@app.on_event("startup")
def startup_event() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        seed()
        logger.info("Database initialized successfully")
    except Exception as exc:  # pragma: no cover - defensive startup handling
        logger.warning("Skipping database initialization: %s", exc)


@app.get("/health")
def health_check_extended():
    return {"status": "ok", "database_url_configured": bool(os.getenv("DATABASE_URL"))}


@app.get("/")
def health_check():
    return {"status": "ok"}
