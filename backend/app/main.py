import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routes import patterns, auth, progress
from app.seed_data import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dsa_patterns_tracker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        seed()
        logger.info("Database initialized & seeded successfully")
    except Exception as exc:
        logger.warning("Database initialization skipped: %s", exc)
    yield


app = FastAPI(title="DSA Patterns Tracker API", lifespan=lifespan)

# Allow local development frontends (any port) and deployed Vercel frontends.
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://localhost:8001",
    "https://dsa-pattern-practice.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^(https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patterns.router)
app.include_router(auth.router)
app.include_router(progress.router)


@app.get("/health")
def health_check_extended():
    return {"status": "ok", "database_url_configured": bool(os.getenv("DATABASE_URL"))}


@app.get("/")
def health_check():
    return {"status": "ok"}
