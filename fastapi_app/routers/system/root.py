"""
routers/root.py — Root and health endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi_app.database import get_db
from fastapi_app.config import APP_ENV

router = APIRouter(tags=["root"])


@router.get("/")
def root():
    """Root health check."""
    return {"status": "ok"}


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Database health check."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "postgresql", "env": APP_ENV}
    except Exception as e:
        return {"status": "error", "db": "postgresql", "error": str(e)}
