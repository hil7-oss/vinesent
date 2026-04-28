"""
dependencies.py — FastAPI Depends для аутентификации.
Единственное место где живёт JWT-логика.
"""
import logging
import jwt
from fastapi import Depends, HTTPException, Request

from .config import JWT_SECRET, JWT_ALGORITHM

logger = logging.getLogger(__name__)


def get_current_user(request: Request) -> dict:
    """
    Извлекает и валидирует JWT из Authorization header или cookie.
    Raises HTTPException(401) если токен отсутствует или невалиден.
    """
    token: str | None = None

    # 1. Authorization: Bearer <token>
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()

    # 2. Fallback: cookie
    if not token:
        token = request.cookies.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_optional_user(request: Request) -> dict | None:
    """
    Аналог get_current_user но возвращает None вместо 401.
    Используется там где auth опционален.
    """
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """
    Требует роль ADMIN. Raises HTTPException(403) иначе.
    """
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
