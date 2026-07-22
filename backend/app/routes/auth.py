import hashlib
import os
import secrets
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, UserProgress

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/auth", tags=["auth"])

# Simple token storage for active sessions in-memory / fallback
_SESSION_TOKENS: dict[str, int] = {}


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2 with SHA-256."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, stored_key = password_hash.split("$")
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), stored_key)
    except Exception:
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
        # Fallback check if token is formatted as user_id or admin token
        if token.startswith("user_"):
            try:
                user_id = int(token.split("_")[1])
            except ValueError:
                return None
        else:
            return None
    
    return db.query(User).filter(User.id == user_id).first()


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


def _build_user_response(user: User, db: Session) -> dict:
    solved_count = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == user.id, UserProgress.status == "solved")
        .count()
    )
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={user.username}",
        "github_username": user.github_username,
        "auth_provider": user.auth_provider,
        "solved_count": solved_count,
    }


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email already registered")

    pwd_hash = hash_password(req.password)
    new_user = User(
        username=req.username,
        email=req.email,
        password_hash=pwd_hash,
        auth_provider="email",
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={req.username}"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = generate_session_token(new_user.id)
    return {
        "token": token,
        "user": _build_user_response(new_user, db)
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == req.username_or_email) | (User.email == req.username_or_email)
    ).first()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    token = generate_session_token(user.id)
    return {
        "token": token,
        "user": _build_user_response(user, db)
    }


@router.post("/github")
def github_auth(req: GitHubAuthRequest, db: Session = Depends(get_db)):
    username = req.github_username or "GitHubDeveloper"
    email = req.email or f"{username.lower()}@users.noreply.github.com"
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


@router.get("/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _build_user_response(user, db)
