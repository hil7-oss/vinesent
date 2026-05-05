"""
Application factory.

Keep `main.py` thin and import-only.
"""

from __future__ import annotations

import logging
import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import Counter, Histogram
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .config import CORS_ORIGINS, TRUSTED_HOSTS, UPLOADS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

REQ_COUNT = Counter("http_requests_total", "HTTP Requests", ["method", "path", "status"])
REQ_LAT = Histogram("http_request_duration_seconds", "HTTP Request latency", ["path"])


class StaticCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/uploads/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            response.headers["Vary"] = "Accept-Encoding"
        return response


def _error_payload(code: int, message: str, request: Request, details: dict | None = None) -> dict:
    rid = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID") or uuid.uuid4().hex
    out: dict = {"error": {"code": code, "message": message, "requestId": rid}}
    if details:
        out["error"]["details"] = details
    return out


def create_app() -> FastAPI:
    app = FastAPI(title="Vinesent API", version="1.0.0")

    # Initialize content and categories on startup
    from .services.content_service import seed_all  # noqa: E402
    seed_all()

    # Seed prompts to data/prompts.json if not yet seeded (runs once, no-op after)
    from .services.prompt_service import seed_prompts_if_empty  # noqa: E402
    seed_prompts_if_empty()

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(StaticCacheMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        start = time.time()
        resp = await call_next(request)
        duration = time.time() - start
        REQ_COUNT.labels(request.method, request.url.path, str(resp.status_code)).inc()
        REQ_LAT.labels(request.url.path).observe(duration)
        return resp

    @app.middleware("http")
    async def request_logger(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = req_id
        start = time.time()
        try:
            response = await call_next(request)
            duration_ms = int((time.time() - start) * 1000)
            response.headers["X-Request-ID"] = req_id
            logger.info("http %s %s %s %dms", request.method, request.url.path, response.status_code, duration_ms)
            return response
        except Exception:
            duration_ms = int((time.time() - start) * 1000)
            logger.exception("http_error %s %s %dms", request.method, request.url.path, duration_ms)
            raise

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(_error_payload(exc.status_code, str(exc.detail), request), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(_error_payload(422, "Validation failed", request, {"errors": exc.errors()}), status_code=422)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("unhandled_exception %s %s", request.method, request.url.path)
        return JSONResponse(_error_payload(500, "Internal Server Error", request), status_code=500)

    # Routers without prefix
    from .routers.system import root_router  # noqa: E402
    app.include_router(root_router)

    # Routers with /api/v1 prefix
    from .routers.ai import ai_photos_router, ai_tryon_router, prompts_router  # noqa: E402
    from .routers.auth import auth_router, users_router  # noqa: E402
    from .routers.catalog import categories_router, products_router, stores_router, variants_router  # noqa: E402
    from .routers.content import content_router, seo_router  # noqa: E402
    from .routers.orders import liqpay_router, orders_router  # noqa: E402
    from .routers.system import (  # noqa: E402
        analytics_router,
        backup_router,
        metrics_router,
        product_images_router,
        recommendations_router,
        uploads_router,
        utility_router,
    )

    app.include_router(auth_router)
    app.include_router(products_router, prefix="/api/v1", tags=["products"])
    app.include_router(categories_router, prefix="/api/v1", tags=["categories"])
    app.include_router(variants_router, prefix="/api/v1", tags=["variants"])
    app.include_router(users_router, prefix="/api/v1", tags=["users"])
    app.include_router(stores_router, prefix="/api/v1", tags=["stores"])
    app.include_router(content_router, prefix="/api/v1", tags=["content"])
    app.include_router(orders_router, prefix="/api/v1", tags=["orders"])
    app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
    app.include_router(utility_router, prefix="/api/v1", tags=["utility"])
    app.include_router(uploads_router, prefix="/api/v1", tags=["uploads"])
    app.include_router(liqpay_router)
    app.include_router(product_images_router, prefix="/api/v1")
    app.include_router(ai_photos_router, prefix="/api", tags=["ai_photos"])
    app.include_router(ai_tryon_router, prefix="/api", tags=["ai_tryon"])
    app.include_router(backup_router, prefix="/api", tags=["backup"])
    app.include_router(recommendations_router, tags=["recommendations"])
    app.include_router(seo_router, tags=["seo"])
    app.include_router(metrics_router, tags=["metrics"])
    app.include_router(prompts_router, tags=["prompts"])

    # Also register key routes at root level for frontend proxy compatibility
    app.include_router(content_router, prefix="")
    app.include_router(categories_router, prefix="")
    app.include_router(products_router, prefix="")
    app.include_router(variants_router, prefix="")
    app.include_router(stores_router, prefix="")
    app.include_router(uploads_router, prefix="")

    return app

