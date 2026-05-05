"""
routers/seo.py — SEO endpoints (sitemap, etc.)
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi_app.database import get_db
from ...core.cache import cache_get, cache_set

router = APIRouter(tags=["seo"])


@router.get("/sitemap-data")
def get_sitemap_data(db: Session = Depends(get_db)):
    """Get lightweight sitemap data: slugs and updatedAt for products and categories."""
    key = "sitemap:data"
    cached = cache_get(key, ttl_s=3600)
    if cached is not None:
        return cached
    
    # Get products (only slug and updatedAt)
    products = db.execute(
        text('SELECT slug, "updatedAt" FROM "Product" WHERE "isArchived" = false OR "isArchived" IS NULL')
    ).mappings().all()
    
    # Get categories
    categories = db.execute(
        text('SELECT slug, "updatedAt" FROM "Category"')
    ).mappings().all()
    
    result = {
        "products": [{"slug": p["slug"], "updatedAt": p.get("updatedAt")} for p in products],
        "categories": [{"slug": c["slug"], "updatedAt": c.get("updatedAt")} for c in categories],
    }
    
    cache_set(key, result)
    return result
