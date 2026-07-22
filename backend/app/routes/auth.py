import hashlib
import os
import secrets
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db import Base, engine, get_db
from app.models import User, UserProgress

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/auth", tags=["auth"])

# Simple token storage for active sessions in-memory
_SESSION_TOKENS: dict[str, int] = {}


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2 with SHA-256."""
    if not password:
        password = ""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    if not password or not password_hash:
        return False
    try:
        parts = password_hash.split("$")
        if len(parts) != 2:
            return False
        salt, stored_key = parts
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), stored_key)
    except Exception as exc:
        logger.warning("Password verification failed: %s", exc)
        return False


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    user_id = _SESSION_TOKENS.get(token)
    
    if not user_id:
        if token.startswith("token_") or token.startswith("user_"):
            try:
                parts = token.split("_")
                if len(parts) >= 2:
                    user_id = int(parts[1])
            except ValueError:
                return None
        else:
            return None

    if not user_id:
        return None

    try:
        return db.query(User).filter(User.id == user_id).first()
    except Exception as exc:
        logger.error("Failed to query user from session token: %s", exc)
        return None


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class GitHubAuthRequest(BaseModel):
    github_username: Optional[str] = "github_user"
    email: Optional[str] = None
    avatar_url: Optional[str] = None


def generate_session_token(user_id: int) -> str:
    token = f"token_{user_id}_{secrets.token_hex(16)}"
    _SESSION_TOKENS[token] = user_id
    return token


def _ensure_db_initialized(db: Session):
    """Ensure DB schema exists and is seeded if tables are missing."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.warning("Failed metadata create_all: %s", exc)


def _build_user_response(user: User, db: Session) -> dict:
    try:
        solved_count = (
            db.query(UserProgress)
            .filter(UserProgress.user_id == user.id, UserProgress.status == "solved")
            .count()
        )
    except Exception as exc:
        logger.warning("Failed to count user solved progress: %s", exc)
        solved_count = 0

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": getattr(user, "avatar_url", None) or f"https://api.dicebear.com/7.x/bottts/svg?seed={user.username}",
        "github_username": getattr(user, "github_username", None),
        "auth_provider": getattr(user, "auth_provider", "email") or "email",
        "solved_count": solved_count,
    }


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        _ensure_db_initialized(db)
        username_clean = req.username.strip()
        email_clean = req.email.strip().lower()

        if not username_clean or not email_clean or not req.password:
            raise HTTPException(status_code=400, detail="Username, email, and password are required")

        existing_user = db.query(User).filter(
            (User.username == username_clean) | (User.email == email_clean)
        ).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="Username or Email already registered")

        pwd_hash = hash_password(req.password)
        new_user = User(
            username=username_clean,
            email=email_clean,
            password_hash=pwd_hash,
            auth_provider="email",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username_clean}"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = generate_session_token(new_user.id)
        return {
            "token": token,
            "user": _build_user_response(new_user, db)
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during registration: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error during registration: {exc}")
    except Exception as exc:
        db.rollback()
        logger.error("Unexpected error during registration: %s", exc)
        raise HTTPException(status_code=500, detail=f"Internal server error during registration: {exc}")


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        _ensure_db_initialized(db)
        identifier = req.username_or_email.strip()
        if not identifier or not req.password:
            raise HTTPException(status_code=400, detail="Username/email and password are required")

        try:
            user = db.query(User).filter(
                (User.username == identifier) | (User.email == identifier.lower())
            ).first()
        except SQLAlchemyError:
            # Retry initializing DB schema & re-seeding if tables missing
            db.rollback()
            from app.seed_data import seed
            seed()
            user = db.query(User).filter(
                (User.username == identifier) | (User.email == identifier.lower())
            ).first()

        if not user or not getattr(user, "password_hash", None) or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username/email or password")

        token = generate_session_token(user.id)
        return {
            "token": token,
            "user": _build_user_response(user, db)
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during login: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error during login: {exc}")
    except Exception as exc:
        db.rollback()
        logger.error("Unexpected error during login: %s", exc)
        raise HTTPException(status_code=500, detail=f"Internal server error during login: {exc}")


@router.post("/github")
def github_auth(req: GitHubAuthRequest, db: Session = Depends(get_db)):
    try:
        _ensure_db_initialized(db)
        username = (req.github_username or "GitHubDeveloper").strip()
        email = (req.email or f"{username.lower()}@users.noreply.github.com").strip().lower()
        avatar_url = req.avatar_url or f"https://github.com/{username}.png"

        user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if not user:
            user = User(
                username=username,
                email=email,
                avatar_url=avatar_url,
                github_username=username,
                auth_provider="github"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = generate_session_token(user.id)
        return {
            "token": token,
            "user": _build_user_response(user, db)
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("GitHub auth error: %s", exc)
        raise HTTPException(status_code=500, detail=f"GitHub authentication failed: {exc}")


@router.get("/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    try:
        user = get_current_user_from_header(authorization, db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return _build_user_response(user, db)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error in /auth/me: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch user session")
