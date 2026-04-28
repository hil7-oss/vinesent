"""
routers/auth.py — Эндпоинты авторизации.
"""
import uuid
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..config import (
    APP_ENV, IS_PRODUCTION,
    BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD,
    get_cookie_secure, get_cookie_domain,
)
from ..dependencies import get_optional_user
from ..services.auth_service import (
    hash_password, verify_password, sign_token,
    get_password_column, get_timestamp_columns, get_user_columns,
)

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


def _fetch_user_auth_row(db: Session, email: str):
    cols = get_user_columns(db)
    pass_col = get_password_column(db)
    name_col = "name" if "name" in cols else "NULL AS name"
    role_col = "role" if "role" in cols else "'USER' AS role"
    q = text(
        f'SELECT id,email,{name_col},"{pass_col}" as "passwordValue",{role_col} '
        'FROM "User" WHERE email=:e'
    )
    return db.execute(q, {"e": email}).mappings().first()


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


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/auth/login")
def auth_login(payload: dict[str, Any], response: Response, db: Session = Depends(get_db)):
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    try:
        row = _fetch_user_auth_row(db, email)
        if row and verify_password(password, str(row.get("passwordValue") or "")):
            token = sign_token({
                "sub": row["id"], "email": row["email"],
                "name": row.get("name"), "role": row.get("role") or "USER"
            })
            _set_auth_cookie(response, token)
            return {"ok": True, "user": {
                "id": row["id"], "email": row["email"],
                "name": row.get("name"), "role": row.get("role") or "USER"
            }}

        # Bootstrap admin (development only or first-time setup)
        if BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD \
                and email == BOOTSTRAP_ADMIN_EMAIL and password == BOOTSTRAP_ADMIN_PASSWORD:
            has_admin = db.execute(
                text('SELECT 1 FROM "User" WHERE role=:r LIMIT 1'), {"r": "ADMIN"}
            ).mappings().first()
            if IS_PRODUCTION and has_admin:
                raise HTTPException(status_code=401, detail="Invalid credentials")

            exists = db.execute(
                text('SELECT id FROM "User" WHERE email=:e'), {"e": BOOTSTRAP_ADMIN_EMAIL}
            ).mappings().first()
            uid = exists["id"] if exists else str(uuid.uuid4())
            if not exists:
                now = datetime.utcnow().isoformat()
                pass_col = get_password_column(db)
                created_col, updated_col = get_timestamp_columns(db)
                db.execute(
                    text(
                        f'INSERT INTO "User" (id,email,name,{pass_col},role,{created_col},{updated_col}) '
                        "VALUES (:id,:e,:n,:ph,:r,:c,:u)"
                    ),
                    dict(
                        id=uid, e=BOOTSTRAP_ADMIN_EMAIL, n="Admin",
                        ph=hash_password(BOOTSTRAP_ADMIN_PASSWORD),
                        r="ADMIN", c=now, u=now
                    )
                )
                db.commit()
            token = sign_token({"sub": uid, "email": BOOTSTRAP_ADMIN_EMAIL, "name": "Admin", "role": "ADMIN"})
            _set_auth_cookie(response, token)
            return {"ok": True, "user": {"id": uid, "email": BOOTSTRAP_ADMIN_EMAIL, "name": "Admin", "role": "ADMIN"}}

        logger.warning("Auth failed for email hash %s", hash(email))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception:
        logger.exception("auth_login_failed")
        raise HTTPException(status_code=500, detail="auth_login_failed")


# ── POST /auth/register ───────────────────────────────────────────────────────

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

    try:
        exists = db.execute(
            text('SELECT id FROM "User" WHERE email=:e'), {"e": email}
        ).mappings().first()
        if exists:
            raise HTTPException(status_code=409, detail="email_taken")

        role = "USER"
        if not IS_PRODUCTION and BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD:
            if email == BOOTSTRAP_ADMIN_EMAIL and password == BOOTSTRAP_ADMIN_PASSWORD:
                role = "ADMIN"

        uid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        pass_col = get_password_column(db)
        created_col, updated_col = get_timestamp_columns(db)
        db.execute(
            text(
                f'INSERT INTO "User" (id,email,name,{pass_col},role,{created_col},{updated_col}) '
                "VALUES (:id,:e,:n,:ph,:r,:c,:u)"
            ),
            dict(id=uid, e=email, n=name or None, ph=hash_password(password), r=role, c=now, u=now)
        )
        db.commit()
        token = sign_token({"sub": uid, "email": email, "name": name or email.split("@")[0], "role": role})
        _set_auth_cookie(response, token)
        return {"ok": True, "user": {"id": uid, "email": email, "name": name or None, "role": role}}
    except HTTPException:
        raise
    except Exception:
        logger.exception("auth_register_failed")
        raise HTTPException(status_code=500, detail="auth_register_failed")


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie(key="token", path="/", samesite="lax", domain=get_cookie_domain())
    return {"ok": True}


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/auth/me")
def auth_me(request: Request, db: Session = Depends(get_db)):
    jwt_user = get_optional_user(request)
    if not jwt_user:
        return {"user": None}
    uid = jwt_user.get("sub") or jwt_user.get("id")
    if not uid:
        return {"user": None}

    pass_col = get_password_column(db)
    created_col, updated_col = get_timestamp_columns(db)
    sql = (
        f'SELECT id, email, name, role, phone, "firstName", "lastName", '
        f'{created_col} as "createdAt", {updated_col} as "updatedAt" '
        'FROM "User" WHERE id=:id'
    )
    row = db.execute(text(sql), {"id": uid}).mappings().first()
    if not row:
        return {"user": None}
    return {"user": dict(row)}


# ── PATCH /auth/me ────────────────────────────────────────────────────────────

@router.patch("/auth/me")
def update_auth_me(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
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

    set_parts = []
    params: dict[str, Any] = {"id": uid, "now": datetime.utcnow().isoformat()}
    for k, v in updates.items():
        col = f'"{k}"' if k in ("firstName", "lastName") else k
        set_parts.append(f"{col}=:{k}")
        params[k] = v

    _, updated_col = get_timestamp_columns(db)
    sql = f'UPDATE "User" SET {", ".join(set_parts)}, {updated_col}=:now WHERE id=:id'
    db.execute(text(sql), params)
    db.commit()
    return auth_me(request, db)
