"""
services/auth_service.py — Утилиты для аутентификации.
Хеширование паролей, верификация, подпись JWT.
"""
import hashlib
import hmac
import os
import base64
import logging
from datetime import datetime, timedelta

import jwt

from ..config import JWT_SECRET, JWT_ALGORITHM

logger = logging.getLogger(__name__)

# Кеш колонок User-таблицы (чтобы не дёргать information_schema при каждом логине)
_user_columns_cache: set[str] | None = None


def get_user_columns(db) -> set[str]:
    """
    Возвращает набор имён колонок таблицы User.
    Результат кешируется на весь lifecycle процесса.
    """
    global _user_columns_cache
    if _user_columns_cache is not None:
        return _user_columns_cache
    from sqlalchemy import text
    rows = db.execute(
        text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name IN ('User', 'user')
        """)
    ).mappings().all()
    _user_columns_cache = {str(r.get("column_name")) for r in rows}
    return _user_columns_cache


def get_password_column(db) -> str:
    cols = get_user_columns(db)
    if "passwordHash" in cols:
        return "passwordHash"
    return "password"


def get_timestamp_columns(db) -> tuple[str, str]:
    cols = get_user_columns(db)
    created = '"createdAt"' if "createdAt" in cols else "createdAt"
    updated = '"updatedAt"' if "updatedAt" in cols else "updatedAt"
    return created, updated


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """PBKDF2-SHA256 с 120 000 итерациями."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return "pbkdf2$120000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(dk).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """
    Поддерживает три формата:
    - pbkdf2$... (наш формат)
    - $2a$/$2b$/$2y$ (bcrypt — Prisma/Node.js)
    - простое сравнение (legacy)
    """
    if not password_hash:
        return False
    try:
        if password_hash.startswith("pbkdf2$"):
            _, iters_str, salt_b64, hash_b64 = password_hash.split("$", 3)
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(hash_b64)
            dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters_str))
            return hmac.compare_digest(dk, expected)

        if password_hash.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                import bcrypt
                return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
            except Exception:
                return False

        # Plain legacy — constant-time compare
        return hmac.compare_digest(password, password_hash)
    except Exception:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────

def sign_token(payload: dict, exp_days: int = 7) -> str:
    """Подписать JWT с exp и iat."""
    now = datetime.utcnow()
    body = payload.copy()
    body.setdefault("iat", int(now.timestamp()))
    body.setdefault("exp", int((now + timedelta(days=exp_days)).timestamp()))
    return jwt.encode(body, JWT_SECRET, algorithm=JWT_ALGORITHM)
