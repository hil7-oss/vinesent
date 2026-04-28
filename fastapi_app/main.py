"""
FastAPI entrypoint (uvicorn target: `fastapi_app.main:app`).
"""

from .app_factory import create_app

app = create_app()

