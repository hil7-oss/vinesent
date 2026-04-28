"""
routers/metrics.py — Prometheus metrics endpoint.
"""
from fastapi import APIRouter, Response, Depends

from ..dependencies import require_admin

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
def get_metrics(user: dict = Depends(require_admin)):
    """Get Prometheus metrics."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)