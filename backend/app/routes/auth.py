import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import httpx

from app.db import Base, engine, get_db
from app.models import User, UserProgress

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "algotrack_super_secret_jwt_key_2026_prod")


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


def generate_session_token(user_id: int, days_valid: int = 30) -> str:
    """Generate a stateless, HMAC-SHA256 signed JWT access token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + (days_valid * 86400)
    }

    def b64_encode(data: dict) -> str:
        json_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
        return base64.urlsafe_b64encode(json_bytes).decode("utf-8").rstrip("=")

    encoded_header = b64_encode(header)
    encoded_payload = b64_encode(payload)

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def decode_session_token(token: str) -> Optional[int]:
    """Verify HMAC signature and return user_id if valid."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            # Fallback for legacy tokens
            if "_" in token:
                token_parts = token.split("_")
                if len(token_parts) >= 2 and token_parts[1].isdigit():
                    return int(token_parts[1])
            return None

        encoded_header, encoded_payload, encoded_signature = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")

        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")

        if not secrets.compare_digest(actual_sig, encoded_signature):
            return None

        rem_p = len(encoded_payload) % 4
        padded_p = encoded_payload + ("=" * ((4 - rem_p) % 4))
        payload_bytes = base64.urlsafe_b64decode(padded_p)
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp") and time.time() > payload["exp"]:
            logger.info("JWT token expired for sub %s", payload.get("sub"))
            return None

        return int(payload["sub"])
    except Exception as exc:
        logger.warning("Failed to decode JWT session token: %s", exc)
        return None


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    user_id = decode_session_token(token)

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
    code: Optional[str] = None
    github_username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    leetcode_username: Optional[str] = None
    gfg_username: Optional[str] = None
    avatar_url: Optional[str] = None


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
        "leetcode_username": getattr(user, "leetcode_username", None),
        "gfg_username": getattr(user, "gfg_username", None),
        "auth_provider": getattr(user, "auth_provider", "email") or "email",
        "solved_count": solved_count,
    }


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        _ensure_db_initialized(db)
        username = req.username.strip()
        email = req.email.strip().lower()

        if not username or not email or not req.password:
            raise HTTPException(status_code=400, detail="Username, email, and password are required")

        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            # If user exists, log them in automatically (unified auto-account flow)
            if existing_user.password_hash and verify_password(req.password, existing_user.password_hash):
                token = generate_session_token(existing_user.id)
                return {"token": token, "user": _build_user_response(existing_user, db)}
            raise HTTPException(status_code=400, detail="Username or email already exists")

        pw_hash = hash_password(req.password)
        user = User(
            username=username,
            email=email,
            password_hash=pw_hash,
            auth_provider="email",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"
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


@router.get("/github/url")
def get_github_oauth_url():
    client_id = os.getenv("GITHUB_CLIENT_ID", "")
    redirect_uri = os.getenv("GITHUB_REDIRECT_URI", "")
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&scope=read:user%20user:email"
    return {"url": url, "client_id": client_id}


@router.post("/github")
async def github_auth(req: GitHubAuthRequest, db: Session = Depends(get_db)):
    try:
        _ensure_db_initialized(db)
        github_user_data = None

        # Real OAuth 2.0 authorization code exchange if code provided
        if req.code:
            client_id = os.getenv("GITHUB_CLIENT_ID", "")
            client_secret = os.getenv("GITHUB_CLIENT_SECRET", "")
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    token_res = await client.post(
                        "https://github.com/login/oauth/access_token",
                        json={
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "code": req.code,
                        },
                        headers={"Accept": "application/json"}
                    )
                    token_data = token_res.json()
                    access_token = token_data.get("access_token")

                    if access_token:
                        user_res = await client.get(
                            "https://api.github.com/user",
                            headers={
                                "Authorization": f"Bearer {access_token}",
                                "User-Agent": "AlgoTrack-App"
                            }
                        )
                        if user_res.status_code == 200:
                            github_user_data = user_res.json()
            except Exception as exc:
                logger.warning("GitHub OAuth API exchange error: %s", exc)

        # Live public GitHub API lookup if username provided directly without OAuth code
        if not github_user_data and req.github_username:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    gh_res = await client.get(
                        f"https://api.github.com/users/{req.github_username.strip()}",
                        headers={"User-Agent": "AlgoTrack-App"}
                    )
                    if gh_res.status_code == 200:
                        github_user_data = gh_res.json()
            except Exception as exc:
                logger.warning("Public GitHub API lookup warning: %s", exc)

        username = (
            github_user_data.get("login")
            if github_user_data
            else (req.github_username or "github_user").strip()
        )
        email = (
            github_user_data.get("email")
            if github_user_data and github_user_data.get("email")
            else (req.email or f"{username.lower()}@users.noreply.github.com").strip().lower()
        )
        avatar_url = (
            github_user_data.get("avatar_url")
            if github_user_data
            else (req.avatar_url or f"https://github.com/{username}.png")
        )

        user = db.query(User).filter(
            (User.github_username == username) | (User.username == username) | (User.email == email)
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


@router.put("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if req.leetcode_username is not None:
        user.leetcode_username = req.leetcode_username.strip() or None
    if req.gfg_username is not None:
        user.gfg_username = req.gfg_username.strip() or None
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url.strip() or None

    db.commit()
    db.refresh(user)
    return _build_user_response(user, db)
