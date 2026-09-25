import base64
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserSession

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=30)
SESSION_RENEW_AFTER = timedelta(days=1)

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
LEGACY_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=64)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("scrypt$"):
        _, n, r, p, salt, expected = stored.split("$")
        digest = hashlib.scrypt(
            password.encode(),
            salt=base64.b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=64,
        )
        return hmac.compare_digest(digest, base64.b64decode(expected))

    # Seeded accounts used unsalted SHA-256; accepted once, then upgraded on login.
    if LEGACY_SHA256.match(stored):
        return hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored)

    return False


def needs_rehash(stored: str) -> bool:
    return not stored.startswith(f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}$")


# Verified against when the email doesn't exist, so response time doesn't reveal which emails are registered.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User, request: Request, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=_token_hash(token),
            user_agent=(request.headers.get("user-agent") or "")[:255],
            created_at=now,
            last_used_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    db.commit()
    _set_cookie(response, token)


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE") == "1",
        path="/",
    )


def end_session(db: Session, request: Request, response: Response) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        db.query(UserSession).filter(UserSession.token_hash == _token_hash(token)).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


def get_current_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")

    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise unauthorized

    session = db.query(UserSession).filter(UserSession.token_hash == _token_hash(token)).first()
    now = datetime.utcnow()
    if session is None or session.expires_at <= now:
        if session is not None:
            db.delete(session)
            db.commit()
        raise unauthorized

    # Sliding expiry: active users stay signed in; idle for 30 days means sign in again.
    if now - session.last_used_at > SESSION_RENEW_AFTER:
        session.last_used_at = now
        session.expires_at = now + SESSION_LIFETIME
        db.commit()
        _set_cookie(response, token)

    return session.user
