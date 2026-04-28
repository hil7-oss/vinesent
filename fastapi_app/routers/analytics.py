"""
routers/analytics.py — Аналитика и статистика.
"""
import logging
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..dependencies import get_current_user, require_admin
from ..config import DEFICIT_THRESHOLD

router = APIRouter(tags=["analytics"])
logger = logging.getLogger(__name__)


def _to_float(x) -> float:
    try:
        if isinstance(x, Decimal):
            return float(x)
        return float(x or 0)
    except Exception:
        return 0.0


# ── GET /analytics/overview ───────────────────────────────────────────────────

@router.get("/analytics/overview")
def analytics_overview(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    total_products = db.execute(text('SELECT COUNT(1) AS c FROM "Product"')).scalar() or 0
    total_variants = db.execute(text('SELECT COUNT(1) AS c FROM "ProductVariant"')).scalar() or 0
    total_stores = db.execute(text('SELECT COUNT(1) AS c FROM "Store"')).scalar() or 0
    active_orders = db.execute(
        text("SELECT COUNT(1) FROM \"Order\" WHERE status IN ('PENDING','PAID','SHIPPED','CONFIRMED')")
    ).scalar() or 0
    revenue = db.execute(
        text("SELECT SUM(total) FROM \"Order\" WHERE status IN ('PAID','SHIPPED','DELIVERED','CONFIRMED')")
    ).scalar() or 0
    return {
        "totalProducts": int(total_products),
        "totalVariants": int(total_variants),
        "totalStores": int(total_stores),
        "activeOrders": int(active_orders),
        "totalRevenue": _to_float(revenue),
    }


# ── GET /analytics/top ────────────────────────────────────────────────────────

@router.get("/analytics/top")
def analytics_top(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    variants = db.execute(
        text("""
            SELECT v.*, p.name AS productName, p.images AS productImages, p.price AS productPrice
            FROM "ProductVariant" v
            JOIN "Product" p ON p.id = v."productId"
            ORDER BY v.stock DESC
            LIMIT 10
        """)
    ).mappings().all()
    top_variants = []
    for r in variants:
        d = dict(r)
        d["product"] = {
            "id": d.get("productId"),
            "name": d.get("productName"),
            "images": d.get("productImages"),
            "price": _to_float(d.get("productPrice")),
        }
        top_variants.append(d)

    top_categories = db.execute(
        text("""
            SELECT "categoryId", SUM(stock) AS stockSum
            FROM "Product"
            WHERE "categoryId" IS NOT NULL AND "categoryId" <> ''
            GROUP BY "categoryId"
            ORDER BY stockSum DESC
            LIMIT 10
        """)
    ).mappings().all()
    return {"topVariants": top_variants, "topCategories": [dict(x) for x in top_categories]}


# ── GET /analytics/stockouts ──────────────────────────────────────────────────

@router.get("/analytics/stockouts")
def analytics_stockouts(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    threshold = DEFICIT_THRESHOLD
    rows = db.execute(
        text("""
            SELECT v.*, p.name AS productName, p.images AS productImages
            FROM "ProductVariant" v
            JOIN "Product" p ON p.id = v."productId"
            WHERE v.stock <= :thr
            ORDER BY v.stock ASC
        """),
        {"thr": threshold},
    ).mappings().all()
    variants = []
    for r in rows:
        d = dict(r)
        d["product"] = {"id": d.get("productId"), "name": d.get("productName"), "images": d.get("productImages")}
        variants.append(d)
    return {"threshold": threshold, "variants": variants}


# ── GET /statistics ────────────────────────────────────────────────────────────

@router.get("/statistics")
def statistics(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    tp = db.execute(text('SELECT COUNT(1) FROM "Product"')).scalar() or 0
    ao = db.execute(
        text("SELECT COUNT(1) FROM \"Order\" WHERE status IN ('PENDING','PAID','SHIPPED','CONFIRMED')")
    ).scalar() or 0
    rev = db.execute(
        text("SELECT SUM(total) FROM \"Order\" WHERE status IN ('PAID','SHIPPED','DELIVERED','CONFIRMED')")
    ).scalar() or 0
    popular = db.execute(
        text("""
            SELECT "categoryId", SUM(stock) AS stockSum
            FROM "Product"
            WHERE "categoryId" IS NOT NULL AND "categoryId" <> ''
            GROUP BY "categoryId"
            ORDER BY stockSum DESC
        """)
    ).mappings().all()
    return {
        "totalProducts": int(tp),
        "activeOrders": int(ao),
        "totalRevenue": _to_float(rev),
        "popularCategories": [dict(x) for x in popular],
    }


# ── GET /statistics/deficit ────────────────────────────────────────────────────

@router.get("/statistics/deficit")
def statistics_deficit(threshold: int = 5, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    rows = db.execute(
        text("""
            SELECT p.*, c.name AS categoryName
            FROM "Product" p
            LEFT JOIN "Category" c ON c.id = p."categoryId"
            WHERE p.stock <= :thr
            ORDER BY p.stock ASC
        """),
        {"thr": threshold},
    ).mappings().all()
    products = []
    for r in rows:
        d = dict(r)
        if d.get("categoryName"):
            d["category"] = {"name": d["categoryName"]}
        products.append(d)
    return {"threshold": threshold, "products": products}
