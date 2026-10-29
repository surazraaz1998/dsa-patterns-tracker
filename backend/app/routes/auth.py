import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import httpx

from app.db import get_db
from app.models import User, UserProgress

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/auth", tags=["auth"])

_DEV_JWT_SECRET = "algotrack-dev-only-secret-change-me"
JWT_SECRET = os.getenv("JWT_SECRET", "").strip() or _DEV_JWT_SECRET
if JWT_SECRET == _DEV_JWT_SECRET:
    logger.warning("JWT_SECRET is not set — using an insecure development secret. Set JWT_SECRET in production.")

MIN_PASSWORD_LENGTH = 6
PROVIDER_LABELS = {"github": "GitHub", "google": "Google"}


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2 with SHA-256."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", (password or "").encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    if not password or not password_hash:
        return False
    try:
        salt, stored_key = password_hash.split("$")
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), stored_key)
    except Exception as exc:
        logger.warning("Password verification failed: %s", exc)
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _sign(signing_input: bytes) -> str:
    return _b64(hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest())


def generate_session_token(user_id: int, days_valid: int = 30) -> str:
    """Generate a stateless, HMAC-SHA256 signed JWT access token."""
    now = int(time.time())
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8"))
    payload = _b64(json.dumps({"sub": user_id, "iat": now, "exp": now + days_valid * 86400}, separators=(",", ":")).encode("utf-8"))
    signature = _sign(f"{header}.{payload}".encode("utf-8"))
    return f"{header}.{payload}.{signature}"


def decode_session_token(token: str) -> Optional[int]:
    """Verify HMAC signature and expiry; return user_id if valid."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        encoded_header, encoded_payload, encoded_signature = parts
        expected = _sign(f"{encoded_header}.{encoded_payload}".encode("utf-8"))
        if not secrets.compare_digest(expected, encoded_signature):
            return None

        padded = encoded_payload + "=" * (-len(encoded_payload) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        if payload.get("exp") and time.time() > payload["exp"]:
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
    except SQLAlchemyError as exc:
        # Surface as 503 so clients keep their session instead of treating it as a logout.
        logger.error("Failed to query user from session token: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class OAuthCodeRequest(BaseModel):
    code: Optional[str] = None
    redirect_uri: Optional[str] = None


class UnifiedEmailAuthRequest(BaseModel):
    email: str
    password: Optional[str] = None
    username: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    leetcode_username: Optional[str] = None
    gfg_username: Optional[str] = None
    avatar_url: Optional[str] = None


def _generate_unique_username(db: Session, base_name: str) -> str:
    cleaned = "".join(c for c in base_name if c.isalnum() or c in ("_", "-")).strip() or "user"
    candidate = cleaned
    counter = 1
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{cleaned}_{counter}"
        counter += 1
    return candidate


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
        "avatar_url": user.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={user.username}",
        "github_username": user.github_username,
        "leetcode_username": user.leetcode_username,
        "gfg_username": user.gfg_username,
        "auth_provider": user.auth_provider or "email",
        "solved_count": solved_count,
    }


def _auth_response(user: User, db: Session) -> dict:
    return {"token": generate_session_token(user.id), "user": _build_user_response(user, db)}


def _redirect_uri(env_key: str, requested: Optional[str]) -> str:
    return (requested or os.getenv(env_key, "http://localhost:5173")).strip().rstrip("/")


@router.post("/email-auth")
def email_auth(req: UnifiedEmailAuthRequest, db: Session = Depends(get_db)):
    """Log in with email + password, or create the account if the email is new."""
    email = req.email.strip().lower()
    password = req.password or ""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    try:
        user = db.query(User).filter(User.email == email).first()

        if user:
            if user.password_hash:
                if not verify_password(password, user.password_hash):
                    raise HTTPException(status_code=401, detail="Incorrect password for this email")
                return _auth_response(user, db)

            provider = PROVIDER_LABELS.get(user.auth_provider or "")
            if provider:
                raise HTTPException(
                    status_code=400,
                    detail=f"This email is linked to {provider} sign-in. Use 'Continue with {provider}'.",
                )
            # Legacy email account created before passwords were mandatory:
            # the first password used becomes the account password.
            if len(password) < MIN_PASSWORD_LENGTH:
                raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
            user.password_hash = hash_password(password)
            db.commit()
            return _auth_response(user, db)

        if len(password) < MIN_PASSWORD_LENGTH:
            raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
        base_uname = req.username.strip() if req.username else email.split("@")[0]
        unique_username = _generate_unique_username(db, base_uname)
        user = User(
            username=unique_username,
            email=email,
            password_hash=hash_password(password),
            auth_provider="email",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={unique_username}",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _auth_response(user, db)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during email auth: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    username = req.username.strip()
    email = req.email.strip().lower()
    if not username or not email or not req.password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")
    if len(req.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

    try:
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(req.password),
            auth_provider="email",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username}",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _auth_response(user, db)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during registration: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    identifier = req.username_or_email.strip()
    if not identifier or not req.password:
        raise HTTPException(status_code=400, detail="Username/email and password are required")
    try:
        user = db.query(User).filter(
            (User.username == identifier) | (User.email == identifier.lower())
        ).first()
    except SQLAlchemyError as exc:
        logger.error("Database error during login: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")

    if not user or not verify_password(req.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    return _auth_response(user, db)


def _find_or_create_oauth_user(
    db: Session, *, provider: str, email: str, handle: str, avatar_url: Optional[str], github_username: Optional[str] = None
) -> User:
    query = User.email == email
    if github_username:
        query = query | (User.github_username == github_username)
    user = db.query(User).filter(query).first()
    if not user:
        user = User(
            username=_generate_unique_username(db, handle),
            email=email,
            avatar_url=avatar_url,
            github_username=github_username,
            auth_provider=provider,
        )
        db.add(user)
    else:
        if github_username and not user.github_username:
            user.github_username = github_username
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user


@router.get("/github/url")
def get_github_oauth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    if not client_id:
        return {"url": "", "client_id": "", "configured": False}
    params = {"client_id": client_id, "redirect_uri": _redirect_uri("GITHUB_REDIRECT_URI", redirect_uri), "scope": "read:user user:email"}
    if state:
        params["state"] = state
    return {"url": f"https://github.com/login/oauth/authorize?{urlencode(params)}", "client_id": client_id, "configured": True}


@router.post("/github")
async def github_auth(req: OAuthCodeRequest, db: Session = Depends(get_db)):
    """Exchange a GitHub OAuth authorization code for a session."""
    if not req.code:
        raise HTTPException(status_code=400, detail="Missing GitHub authorization code")
    client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured on the server")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": req.code,
                    "redirect_uri": _redirect_uri("GITHUB_REDIRECT_URI", req.redirect_uri),
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                reason = token_data.get("error_description") or token_data.get("error") or "token exchange failed"
                raise HTTPException(status_code=401, detail=f"GitHub sign-in failed: {reason}")

            gh_headers = {"Authorization": f"Bearer {access_token}", "User-Agent": "AlgoTrack-App"}
            user_res = await client.get("https://api.github.com/user", headers=gh_headers)
            emails_res = await client.get("https://api.github.com/user/emails", headers=gh_headers)
    except httpx.HTTPError as exc:
        logger.warning("GitHub OAuth network error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach GitHub, please try again")

    if user_res.status_code != 200:
        raise HTTPException(status_code=401, detail="GitHub sign-in failed: could not read profile")
    gh_user = user_res.json()
    handle = gh_user["login"]

    verified = [e for e in (emails_res.json() if emails_res.status_code == 200 else []) if e.get("verified")]
    primary = next((e["email"] for e in verified if e.get("primary")), None)
    email = (primary or (verified[0]["email"] if verified else None) or f"{handle.lower()}@users.noreply.github.com").strip().lower()

    try:
        user = _find_or_create_oauth_user(
            db, provider="github", email=email, handle=handle,
            avatar_url=gh_user.get("avatar_url"), github_username=handle,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during GitHub auth: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")
    return _auth_response(user, db)


@router.get("/google/url")
def get_google_oauth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        return {"url": "", "client_id": "", "configured": False}
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri("GOOGLE_REDIRECT_URI", redirect_uri),
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
    }
    if state:
        params["state"] = state
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}", "client_id": client_id, "configured": True}


@router.post("/google")
async def google_auth(req: OAuthCodeRequest, db: Session = Depends(get_db)):
    """Exchange a Google OAuth authorization code for a session."""
    if not req.code:
        raise HTTPException(status_code=400, detail="Missing Google authorization code")
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": req.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": _redirect_uri("GOOGLE_REDIRECT_URI", req.redirect_uri),
                },
            )
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                reason = token_data.get("error_description") or token_data.get("error") or "token exchange failed"
                raise HTTPException(status_code=401, detail=f"Google sign-in failed: {reason}")
            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except httpx.HTTPError as exc:
        logger.warning("Google OAuth network error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach Google, please try again")

    info = user_res.json() if user_res.status_code == 200 else {}
    email = (info.get("email") or "").strip().lower()
    if not email or info.get("verified_email") is False:
        raise HTTPException(status_code=401, detail="Google sign-in failed: no verified email on this account")

    try:
        user = _find_or_create_oauth_user(
            db, provider="google", email=email,
            handle=info.get("name") or info.get("given_name") or email.split("@")[0],
            avatar_url=info.get("picture"),
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database error during Google auth: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again in a moment")
    return _auth_response(user, db)


@router.get("/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _build_user_response(user, db)


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
