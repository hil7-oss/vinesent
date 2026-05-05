# routers/system/__init__.py
# System domain: health, uploads, metrics, backup, analytics, recommendations
from .root import router as root_router
from .utility import router as utility_router
from .uploads import router as uploads_router
from .product_images import router as product_images_router
from .backup import router as backup_router
from .analytics import router as analytics_router
from .metrics import router as metrics_router
from .recommendations import router as recommendations_router

__all__ = [
    "root_router", "utility_router", "uploads_router", "product_images_router",
    "backup_router", "analytics_router", "metrics_router", "recommendations_router",
]
