# routers/catalog/__init__.py
# Catalog domain: products, categories, variants, stores
from .products import router as products_router
from .categories import router as categories_router
from .variants import router as variants_router
from .stores import router as stores_router

__all__ = ["products_router", "categories_router", "variants_router", "stores_router"]
