"""Orders domain routers."""
from .routes import router as orders_router
from .liqpay import router as liqpay_router

__all__ = ["orders_router", "liqpay_router"]
