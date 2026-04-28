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

from ..config import CONTENT_PATH, LEGACY_CONTENT_PATH
from ..dependencies import require_admin
from ..core.storage import read_json, write_json
from ..schemas import ContentData, Banner, BannerUpdate, CollectionUpdate

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
