"""Content domain routers."""
from .routes import router as content_router
from .seo import router as seo_router

__all__ = ["content_router", "seo_router"]
