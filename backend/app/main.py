import logging
import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import init_db
from app.routes import patterns, auth, progress
from app.seed_data import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dsa_patterns_tracker")

# Sliding window rate limiter state: client_ip -> list of timestamps
_REQUEST_HISTORY: dict[str, list[float]] = defaultdict(list)

# Rate limits (requests per minute per IP)
AUTH_RATE_LIMIT = 20
GENERAL_RATE_LIMIT = 150
WINDOW_SECONDS = 60.0


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


@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    # Pass through OPTIONS preflight requests immediately
    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = request.client.host if request.client else "127.0.0.1"
    path = request.url.path
    now = time.time()

    limit = AUTH_RATE_LIMIT if path.startswith("/auth/") else GENERAL_RATE_LIMIT

    # Clean old timestamps outside the sliding window
    history = [t for t in _REQUEST_HISTORY[client_ip] if now - t < WINDOW_SECONDS]
    _REQUEST_HISTORY[client_ip] = history

    if len(history) >= limit:
        logger.warning("Rate limit exceeded for IP %s on path %s", client_ip, path)
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please wait a minute before making more requests."},
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )

    _REQUEST_HISTORY[client_ip].append(now)
    response = await call_next(request)
    remaining = max(0, limit - len(_REQUEST_HISTORY[client_ip]))
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response


app.include_router(patterns.router)
app.include_router(auth.router)
app.include_router(progress.router)


@app.get("/health")
def health_check_extended():
    return {"status": "ok", "database_url_configured": bool(os.getenv("DATABASE_URL"))}


@app.get("/")
def health_check():
    return {"status": "ok"}
