"""
routers/auth/routes.py — Эндпоинты авторизации.
"""
import uuid
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from fastapi_app.database import get_db
from fastapi_app.config import (
    APP_ENV, IS_PRODUCTION,
    BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD,
    get_cookie_secure, get_cookie_domain,
)
from fastapi_app.models import User
from fastapi_app.services.auth_service import (
    hash_password, verify_password, sign_token,
)

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
        domain=get_cookie_domain(),
    )


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "firstName": user.firstName,
        "lastName": user.lastName,
        "phone": user.phone,
    }


# ── POST /auth/login ───────────────────────────────────────────

@router.post("/auth/login")
def auth_login(payload: dict[str, Any], response: Response, db: Session = Depends(get_db)):
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    user = db.query(User).filter(User.email == email).first()

    if user and verify_password(password, user.passwordHash):
        token = sign_token({
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
        })
        _set_auth_cookie(response, token)
        return {"ok": True, "user": _user_to_dict(user)}

    # Bootstrap admin (development only or first-time setup)
    if (BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD
            and email == BOOTSTRAP_ADMIN_EMAIL and password == BOOTSTRAP_ADMIN_PASSWORD):
        has_admin = db.query(User).filter(User.role == "ADMIN").first()
        if IS_PRODUCTION and has_admin:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = db.query(User).filter(User.email == BOOTSTRAP_ADMIN_EMAIL).first()
        if not user:
            now = datetime.utcnow().isoformat()
            user = User(
                id=str(uuid.uuid4()),
                email=BOOTSTRAP_ADMIN_EMAIL,
                name="Admin",
                passwordHash=hash_password(BOOTSTRAP_ADMIN_PASSWORD),
                role="ADMIN",
                createdAt=now,
                updatedAt=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = sign_token({
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
        })
        _set_auth_cookie(response, token)
        return {"ok": True, "user": _user_to_dict(user)}

    logger.warning("Auth failed for email hash %s", hash(email))
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ── POST /auth/register ────────────────────────────────────────

@router.post("/auth/register")
def auth_register(payload: dict[str, Any], response: Response, db: Session = Depends(get_db)):
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    name = str(payload.get("name") or "").strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="password too short (min 6 chars)")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="invalid email")

    exists = db.query(User).filter(User.email == email).first()
    if exists:
        raise HTTPException(status_code=409, detail="email_taken")

    role = "USER"
    if not IS_PRODUCTION and BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD:
        if email == BOOTSTRAP_ADMIN_EMAIL and password == BOOTSTRAP_ADMIN_PASSWORD:
            role = "ADMIN"

    now = datetime.utcnow().isoformat()
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        passwordHash=hash_password(password),
        role=role,
        createdAt=now,
        updatedAt=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = sign_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name or email.split("@")[0],
        "role": role,
    })
    _set_auth_cookie(response, token)
    return {"ok": True, "user": _user_to_dict(user)}


# ── POST /auth/logout ─────────────────────────────────────────

@router.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie(key="token", path="/", samesite="lax", domain=get_cookie_domain())
    return {"ok": True}


# ── GET /auth/me ──────────────────────────────────────────────

@router.get("/auth/me")
def auth_me(request: Request, db: Session = Depends(get_db)):
    from fastapi_app.dependencies import get_optional_user
    jwt_user = get_optional_user(request)
    if not jwt_user:
        return {"user": None}
    uid = jwt_user.get("sub") or jwt_user.get("id")
    if not uid:
        return {"user": None}

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        return {"user": None}
    return {"user": _user_to_dict(user)}


# ── PATCH /auth/me ────────────────────────────────────────────

@router.patch("/auth/me")
def update_auth_me(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    from fastapi_app.dependencies import get_optional_user
    jwt_user = get_optional_user(request)
    if not jwt_user:
        raise HTTPException(status_code=401, detail="unauthorized")
    uid = jwt_user.get("sub") or jwt_user.get("id")

    field_map = {
        "firstName": payload.get("firstName") or payload.get("customerFirstName"),
        "lastName": payload.get("lastName") or payload.get("customerLastName"),
        "phone": payload.get("phone") or payload.get("customerPhone"),
        "name": payload.get("name"),
    }
    updates = {k: v for k, v in field_map.items() if v is not None}
    if not updates:
        return auth_me(request, db)

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    for key, value in updates.items():
        setattr(user, key, value)

    user.updatedAt = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(user)
    return {"user": _user_to_dict(user)}
