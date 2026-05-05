"""
routers/content.py — CMS и контент-менеджмент.
Banners, Promo Banners, Collections, Navigation.
Данные хранятся в content.json (thread-safe через core.storage).
"""
import uuid
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi_app.config import CONTENT_PATH, LEGACY_CONTENT_PATH
from fastapi_app.database import get_db
from fastapi_app.dependencies import require_admin
from ...core.storage import read_json, write_json
from fastapi_app.schemas import ContentData, Banner, BannerUpdate, CollectionUpdate

router = APIRouter(tags=["content"])
logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_content() -> dict:
    """Читает content.json. Если не существует — пытается загрузить legacy path."""
    data = read_json(CONTENT_PATH)
    if data is None:
        data = read_json(LEGACY_CONTENT_PATH)
    if not isinstance(data, dict):
        data = {}
    now = datetime.utcnow().isoformat()
    data.setdefault("banners", [])
    data.setdefault("promoBanners", [])
    data.setdefault("collections", [])
    data.setdefault("navigation", [])
    data.setdefault("updatedAt", now)
    return data


def _write_content(data: dict) -> ContentData:
    """Сохраняет данные и возвращает ContentData."""
    data["updatedAt"] = datetime.utcnow().isoformat()
    write_json(CONTENT_PATH, data)
    return ContentData(**data)


# ── GET /content ──────────────────────────────────────────────────────────────

@router.get("/content", response_model=ContentData)
def get_content():
    return _read_content()


# ── PUT /content ──────────────────────────────────────────────────────────────

@router.put("/content", response_model=ContentData)
def update_content(payload: dict[str, Any], user: dict = Depends(require_admin)):
    data = _read_content()
    allowed = {"banners", "promoBanners", "collections", "navigation"}
    for key, value in payload.items():
        if key in allowed:
            data[key] = value
    return _write_content(data)


# ███████████████████████████████████ BANNERS ██████████████████████████████████

@router.get("/content/banners")
def list_banners():
    return _read_content().get("banners", [])


@router.post("/content/banners", response_model=ContentData)
def create_banner(payload: dict[str, Any], user: dict = Depends(require_admin)):
    data = _read_content()
    banners: list = data.get("banners", [])

    banner = {
        "id": str(uuid.uuid4()),
        "title": str(payload.get("title") or "").strip() or "Banner",
        "subtitle": payload.get("subtitle"),
        "image": str(payload.get("image") or "").strip(),
        "link": str(payload.get("link") or "").strip() or "/",
        "position": payload.get("position"),
        "active": bool(payload.get("active", True)),
        "text": payload.get("text"),
        "bgColor": payload.get("bgColor"),
        "textColor": payload.get("textColor"),
        "buttonText": payload.get("buttonText"),
        "buttonLink": payload.get("buttonLink"),
        "buttonBgColor": payload.get("buttonBgColor"),
        "buttonTextColor": payload.get("buttonTextColor"),
        "showTimer": payload.get("showTimer"),
        "timerEndsAt": payload.get("timerEndsAt"),
        "showAnimation": payload.get("showAnimation"),
    }
    banners.append(banner)
    data["banners"] = banners
    return _write_content(data)


@router.put("/content/banners/{banner_id}", response_model=ContentData)
def update_banner(banner_id: str, payload: BannerUpdate, user: dict = Depends(require_admin)):
    data = _read_content()
    banners: list = data.get("banners", [])
    idx = next((i for i, b in enumerate(banners) if b.get("id") == banner_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Banner not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            banners[idx][field] = value

    data["banners"] = banners
    return _write_content(data)


@router.delete("/content/banners/{banner_id}", response_model=ContentData)
def delete_banner(banner_id: str, user: dict = Depends(require_admin)):
    data = _read_content()
    data["banners"] = [b for b in data.get("banners", []) if b.get("id") != banner_id]
    return _write_content(data)


@router.patch("/content/banners/reorder", response_model=ContentData)
def reorder_banners(payload: dict[str, Any], user: dict = Depends(require_admin)):
    """payload: {"ids": ["id1", "id2", ...]}"""
    ids: list[str] = payload.get("ids") or []
    data = _read_content()
    banners = data.get("banners", [])
    id_order = {bid: i for i, bid in enumerate(ids)}
    banners.sort(key=lambda b: id_order.get(b.get("id", ""), 9999))
    data["banners"] = banners
    return _write_content(data)


# ███████████████████████████████████ PROMO BANNERS ████████████████████████████

@router.get("/promo-banners")
@router.get("/content/promo-banners")
def list_promo_banners():
    return _read_content().get("promoBanners", [])


@router.post("/promo-banners", response_model=ContentData)
@router.post("/content/promo-banners", response_model=ContentData)
def create_promo_banner(payload: dict[str, Any], user: dict = Depends(require_admin)):
    data = _read_content()
    promo: list = data.get("promoBanners", [])
    item = {
        "id": str(uuid.uuid4()),
        "text": str(payload.get("text") or "").strip(),
        "bgColor": payload.get("bgColor"),
        "textColor": payload.get("textColor"),
        "buttonText": payload.get("buttonText"),
        "buttonLink": payload.get("buttonLink"),
        "buttonBgColor": payload.get("buttonBgColor"),
        "buttonTextColor": payload.get("buttonTextColor"),
        "showTimer": payload.get("showTimer"),
        "timerEndsAt": payload.get("timerEndsAt"),
        "showAnimation": payload.get("showAnimation"),
        "active": bool(payload.get("active", True)),
    }
    promo.append(item)
    data["promoBanners"] = promo
    return _write_content(data)


@router.put("/promo-banners/{banner_id}", response_model=ContentData)
@router.put("/content/promo-banners/{banner_id}", response_model=ContentData)
def update_promo_banner(banner_id: str, payload: dict[str, Any], user: dict = Depends(require_admin)):
    data = _read_content()
    promo: list = data.get("promoBanners", [])
    idx = next((i for i, b in enumerate(promo) if b.get("id") == banner_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Promo banner not found")

    updatable = {
        "text", "bgColor", "textColor", "buttonText", "buttonLink",
        "buttonBgColor", "buttonTextColor", "showTimer", "timerEndsAt",
        "showAnimation", "active"
    }
    for key, val in payload.items():
        if key in updatable:
            promo[idx][key] = val

    data["promoBanners"] = promo
    return _write_content(data)


@router.delete("/promo-banners/{banner_id}", response_model=ContentData)
@router.delete("/content/promo-banners/{banner_id}", response_model=ContentData)
def delete_promo_banner(banner_id: str, user: dict = Depends(require_admin)):
    data = _read_content()
    data["promoBanners"] = [b for b in data.get("promoBanners", []) if b.get("id") != banner_id]
    return _write_content(data)


# ███████████████████████████████████ NAVIGATION ███████████████████████████████

@router.get("/content/navigation")
def get_navigation():
    return _read_content().get("navigation", [])


@router.put("/content/navigation", response_model=ContentData)
def update_navigation(payload: dict[str, Any], user: dict = Depends(require_admin)):
    items = payload.get("items") or payload.get("navigation") or []
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items must be a list")
    data = _read_content()
    data["navigation"] = items
    return _write_content(data)


# ███████████████████████████████████ COLLECTIONS ██████████████████████████████

@router.get("/content/collections")
def list_collections():
    return _read_content().get("collections", [])


@router.put("/content/collections/{key}", response_model=ContentData)
def update_collection(key: str, payload: CollectionUpdate, user: dict = Depends(require_admin)):
    target = str(key or "").strip().upper()
    data = _read_content()
    collections = data.get("collections", [])

    idx = next((i for i, c in enumerate(collections) if str(c.get("key") or "").strip().upper() == target), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Collection not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "productIds" and isinstance(value, list):
            collections[idx]["productIds"] = [str(x).strip() for x in value if str(x).strip()]
        elif value is not None:
            collections[idx][field] = value

    data["collections"] = collections
    return _write_content(data)


@router.post("/content/collections", response_model=ContentData)
def create_collection(payload: dict[str, Any], user: dict = Depends(require_admin)):
    key = str(payload.get("key") or "").strip().upper()
    if not key:
        raise HTTPException(status_code=400, detail="key required")

    title = str(payload.get("title") or key).strip() or key
    description = payload.get("description") or ""
    product_ids = payload.get("productIds") or []

    if not isinstance(product_ids, list):
        if isinstance(product_ids, str):
            product_ids = [s.strip() for s in product_ids.split(",") if s and s.strip()]
        else:
            product_ids = []

    data = _read_content()
    collections = data.get("collections", [])

    if any(str(c.get("key") or "").strip().upper() == key for c in collections):
        raise HTTPException(status_code=409, detail="collection_key_exists")

    collections.append({
        "id": str(uuid.uuid4()),
        "key": key,
        "title": title,
        "description": description,
        "productIds": [str(x).strip() for x in product_ids if str(x).strip()],
    })
    data["collections"] = collections
    return _write_content(data)


@router.delete("/content/collections/{key}", response_model=ContentData)
def delete_collection(key: str, user: dict = Depends(require_admin)):
    target = str(key or "").strip().upper()
    data = _read_content()
    data["collections"] = [
        c for c in data.get("collections", [])
        if str(c.get("key") or "").strip().upper() != target
    ]
    return _write_content(data)


# ── GET /content/home ────────────────────────────────────────────────────────────

@router.get("/content/home")
def get_content_home(db: Session = Depends(get_db)):
    """Get home page content: banners, promo-banners, collections, and products."""
    from datetime import datetime, timedelta
    
    data = _read_content()
    collections = [dict(c) for c in (data.get("collections", []) or [])]
    
    # Get all products
    all_rows = db.execute(
        text('SELECT id, name, slug, description, price, "salePrice", images, stock, "categoryId", "createdAt" FROM "Product" ORDER BY "createdAt" DESC')
    ).mappings().all()
    all_by_id = {str(r["id"]): dict(r) for r in all_rows}
    
    # Get product-category links
    links = db.execute(text('SELECT "A", "B" FROM "_ProductCategories"')).fetchall()
    products_by_category: dict[str, set[str]] = {}
    for cid, pid in links:
        if cid and pid:
            products_by_category.setdefault(str(cid), set()).add(str(pid))
    
    # Legacy category links
    legacy = db.execute(text('SELECT id, "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL AND "categoryId" <> \'\'')).fetchall()
    for pid, cid in legacy:
        if cid and pid:
            products_by_category.setdefault(str(cid), set()).add(str(pid))
    
    # Get categories
    cat_rows = db.execute(text('SELECT id, name, slug, "parentId" FROM "Category"')).mappings().all()
    categories_by_key: dict[str, list[str]] = {}
    children_by_parent: dict[str, list[str]] = {}
    for c in cat_rows:
        cid = str(c.get("id") or "")
        if not cid:
            continue
        slug = str(c.get("slug") or "").strip().lower()
        name = str(c.get("name") or "").strip().lower()
        parent_id = str(c.get("parentId") or "")
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(cid)
        if slug:
            categories_by_key.setdefault(slug, []).append(cid)
        if name:
            categories_by_key.setdefault(name, []).append(cid)
    
    # Resolve products for each collection
    product_ids: list[str] = []
    for c in collections:
        key = str(c.get("key") or "").strip().upper()
        explicit = [str(x).strip() for x in (c.get("productIds") or []) if str(x).strip()]
        resolved = list(dict.fromkeys(explicit))
        
        if not resolved:
            if key == "NEW":
                # Latest 16 products
                resolved = [str(r["id"]) for r in all_rows[:16]]
            elif key == "SALE":
                # Products with real discount (salePrice < price)
                resolved = [str(r["id"]) for r in all_rows if r.get("salePrice") not in (None, "", 0, 0.0) and r.get("salePrice") < r.get("price", 0)]
            else:
                # Resolve by category
                k = key.lower()
                match_ids = categories_by_key.get(k, [])
                hits: set[str] = set()
                for root_cid in match_ids:
                    stack = [root_cid]
                    seen_cats: set[str] = set()
                    while stack:
                        cur = stack.pop()
                        if cur in seen_cats:
                            continue
                        seen_cats.add(cur)
                        hits |= products_by_category.get(cur, set())
                        stack.extend(children_by_parent.get(cur, []))
                resolved = list(hits)
        
        c["productIds"] = resolved
        product_ids.extend(resolved)
    
    product_ids = list(dict.fromkeys(product_ids))
    
    # Build products list
    products = []
    for pid in product_ids:
        row = all_by_id.get(str(pid))
        if not row:
            continue
        products.append({
            "id": row["id"],
            "name": row.get("name"),
            "slug": row.get("slug"),
            "description": row.get("description"),
            "price": row.get("price"),
            "images": row.get("images"),
            "stock": row.get("stock"),
            "categoryId": row.get("categoryId"),
        })
    
    return {
        "banners": data.get("banners", []),
        "promoBanners": data.get("promoBanners", []),
        "collections": collections,
        "navigation": data.get("navigation", []),
        "products": products,
        "updatedAt": data.get("updatedAt"),
    }

