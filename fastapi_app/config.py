"""
config.py — Единая точка загрузки всех переменных окружения.
Импортируйте отсюда, а не из os.environ напрямую.
"""
import os
import base64
import logging
import tempfile
from dotenv import load_dotenv

# ── ENV loading ────────────────────────────────────────────────────────────────
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_APP_DIR)

# Priority 1: fastapi_app/.env
_local_env = os.path.join(_APP_DIR, ".env")
if os.path.exists(_local_env):
    load_dotenv(_local_env)

# Priority 2: project root .env
_root_env = os.path.join(_PROJECT_ROOT, ".env")
if os.path.exists(_root_env):
    load_dotenv(_root_env, override=False)

# Priority 3: Legacy vinesent-api path (fallback for local dev only)
_legacy_env = os.path.join(_PROJECT_ROOT, "vinesent-api", ".env")
if os.path.exists(_legacy_env):
    load_dotenv(_legacy_env, override=False)

# ── Google Cloud Credentials (Base64 encoded) ──────────────────────────────────
_b64_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_B64")
if _b64_creds:
    try:
        _decoded = base64.b64decode(_b64_creds)
        _tmp_creds = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        _tmp_creds.write(_decoded)
        _tmp_creds.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _tmp_creds.name
        logging.info("Decoded GOOGLE_APPLICATION_CREDENTIALS_B64 to %s", _tmp_creds.name)
    except Exception as e:
        logging.error("Failed to decode GOOGLE_APPLICATION_CREDENTIALS_B64: %s", e)

# ── App environment ───────────────────────────────────────────────────────────
APP_ENV: str = (os.environ.get("APP_ENV") or "development").lower()
IS_PRODUCTION: bool = APP_ENV == "production"

# ── JWT ────────────────────────────────────────────────────────────────────────
def _resolve_jwt_secret() -> str:
    v = os.environ.get("JWT_SECRET")
    if v:
        return v
    # Fallback: try legacy vinesent-api .env directly
    env_path = os.path.join(_PROJECT_ROOT, "vinesent-api", ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, val = line.split("=", 1)
                    if k.strip() == "JWT_SECRET":
                        return val.strip().strip("'\"")
        except Exception:
            pass
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET is required in production")
    return "dev-secret"


JWT_SECRET: str = _resolve_jwt_secret()
JWT_ALGORITHM: str = (os.environ.get("JWT_ALGORITHM") or "").strip() or "HS256"

if IS_PRODUCTION and not os.environ.get("JWT_ALGORITHM", "").strip():
    raise RuntimeError("JWT_ALGORITHM is required in production")

# ── CORS ───────────────────────────────────────────────────────────────────────
_origins_env = os.environ.get("CORS_ALLOW_ORIGINS", "")
CORS_ORIGINS: list[str] = [o.strip() for o in _origins_env.split(",") if o.strip()]

if IS_PRODUCTION:
    if not CORS_ORIGINS:
        raise RuntimeError("CORS_ALLOW_ORIGINS is required in production")
    if any(o == "*" for o in CORS_ORIGINS):
        raise RuntimeError("CORS_ALLOW_ORIGINS must not include wildcard '*' in production")
else:
    if not CORS_ORIGINS:
        CORS_ORIGINS = ["http://localhost:3000"]

# ── Trusted Hosts ──────────────────────────────────────────────────────────────
_hosts_env = os.environ.get("TRUSTED_HOSTS", "") or os.environ.get("ALLOWED_HOSTS", "")
TRUSTED_HOSTS: list[str] = [h.strip() for h in _hosts_env.split(",") if h.strip()]

if IS_PRODUCTION and not TRUSTED_HOSTS:
    raise RuntimeError("TRUSTED_HOSTS is required in production")
if not TRUSTED_HOSTS:
    TRUSTED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

# ── LiqPay ────────────────────────────────────────────────────────────────────
LIQPAY_PUBLIC_KEY: str = os.environ.get("LIQPAY_PUBLIC_KEY") or ""
LIQPAY_PRIVATE_KEY: str = os.environ.get("LIQPAY_PRIVATE_KEY") or ""
LIQPAY_CURRENCY: str = os.environ.get("LIQPAY_CURRENCY", "UAH")


def get_liqpay_callback_url() -> str:
    v = os.environ.get("LIQPAY_CALLBACK_URL") or ""
    if IS_PRODUCTION and not v:
        raise RuntimeError("LIQPAY_CALLBACK_URL is required in production")
    if IS_PRODUCTION and v and not v.startswith("https://"):
        raise RuntimeError("LIQPAY_CALLBACK_URL must be https in production")
    return v or "http://localhost:8000/liqpay/callback"


def get_liqpay_result_base() -> str:
    v = os.environ.get("LIQPAY_RESULT_BASE") or os.environ.get("LIQPAY_RESULT_URL_BASE") or ""
    if IS_PRODUCTION and not v:
        raise RuntimeError("LIQPAY_RESULT_BASE is required in production")
    if IS_PRODUCTION and v and not v.startswith("https://"):
        raise RuntimeError("LIQPAY_RESULT_BASE must be https in production")
    return v or "http://localhost:3000"


# ── Uploads ───────────────────────────────────────────────────────────────────
MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", "10485760"))

# ── Bootstrap Admin ───────────────────────────────────────────────────────────
BOOTSTRAP_ADMIN_EMAIL: str = (os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or "").strip().lower()
BOOTSTRAP_ADMIN_PASSWORD: str = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD") or ""

if not IS_PRODUCTION:
    BOOTSTRAP_ADMIN_EMAIL = BOOTSTRAP_ADMIN_EMAIL or "admin@example.com"
    BOOTSTRAP_ADMIN_PASSWORD = BOOTSTRAP_ADMIN_PASSWORD or "adminadmin"

# ── Content / CMS ─────────────────────────────────────────────────────────────
_CONTENT_DIR = str(os.environ.get("CONTENT_DATA_DIR") or "").strip()
if not _CONTENT_DIR:
    _CONTENT_DIR = os.path.join(_APP_DIR, "data")
CONTENT_PATH: str = os.path.abspath(os.path.join(_CONTENT_DIR, "content.json"))
SEO_HIDDEN_PATH: str = os.path.abspath(os.path.join(_CONTENT_DIR, "seo_hidden.json"))

# Legacy paths (read-only fallbacks)
LEGACY_CONTENT_PATH: str = os.path.abspath(
    os.path.join(_APP_DIR, "..", "vinesent-api", "src", "data", "content.json")
)
LEGACY_SEO_HIDDEN_PATH: str = os.path.abspath(
    os.path.join(_APP_DIR, "..", "vinesent-api", "src", "data", "seo_hidden.json")
)

# ── Cookie ────────────────────────────────────────────────────────────────────
def get_cookie_secure() -> bool:
    return IS_PRODUCTION


def get_cookie_domain() -> str | None:
    v = str(os.environ.get("COOKIE_DOMAIN") or "").strip()
    return v or None

# ── Analytics ─────────────────────────────────────────────────────────────────
DEFICIT_THRESHOLD: int = int(os.getenv("DEFICIT_THRESHOLD", "5"))

# ── Uploads dir (resolved at module level for convenience) ────────────────────
FASTAPI_DIR: str = _APP_DIR
UPLOADS_DIR: str = os.path.join(_APP_DIR, "uploads")
