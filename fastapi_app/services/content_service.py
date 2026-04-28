"""
services/content_service.py — Content initialization and seeding.
"""
import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import CONTENT_PATH, LEGACY_CONTENT_PATH, SEO_HIDDEN_PATH, LEGACY_SEO_HIDDEN_PATH
from ..database import get_db
from ..core.storage import read_json, write_json

logger = logging.getLogger(__name__)


def seed_base_categories():
    """Create base categories if they don't exist."""
    db = next(get_db())
    try:
        base = [
            {"name": "Вона", "slug": "girl", "description": "Колекція для дівчаток"},
            {"name": "Він", "slug": "boy", "description": "Колекція для хлопчиків"},
            {"name": "NEW", "slug": "new", "description": "Новинки"},
            {"name": "SALE", "slug": "sale", "description": "Знижки"},
            {"name": "WINTER", "slug": "winter"},
            {"name": "SPRING", "slug": "spring"},
            {"name": "SUMMER", "slug": "summer"},
            {"name": "AUTUMN", "slug": "autumn"},
        ]
        
        # Subcategories for Girl
        girl_subs = [
            {"name": "Куртки", "slug": "girl-jackets"},
            {"name": "Штани", "slug": "girl-pants"},
            {"name": "Сукні", "slug": "girl-dresses"},
            {"name": "Футболки", "slug": "girl-tshirts"},
            {"name": "Взуття", "slug": "girl-shoes"},
        ]
        
        # Subcategories for Boy
        boy_subs = [
            {"name": "Куртки", "slug": "boy-jackets"},
            {"name": "Штани", "slug": "boy-pants"},
            {"name": "Футболки", "slug": "boy-tshirts"},
            {"name": "Взуття", "slug": "boy-shoes"},
        ]
        
        rows = db.execute(text('SELECT id, slug FROM "Category"')).mappings().all()
        existing = {r["slug"]: r["id"] for r in rows}
        
        now = datetime.utcnow().isoformat()
        added = False
        
        for item in base:
            if item["slug"] in existing:
                continue
            new_id = str(uuid.uuid4())
            db.execute(
                text(
                    'INSERT INTO "Category" (id, name, slug, description, image, "parentId", "createdAt", "updatedAt") '
                    'VALUES (:id, :name, :slug, :description, :image, :parentId, :createdAt, :updatedAt)'
                ),
                dict(
                    id=new_id,
                    name=item["name"],
                    slug=item["slug"],
                    description=item.get("description"),
                    image=item.get("image"),
                    parentId=None,
                    createdAt=now,
                    updatedAt=now,
                ),
            )
            existing[item["slug"]] = new_id
            added = True
        
        # Ensure subcategories
        girl_id = existing.get("girl")
        if girl_id:
            for item in girl_subs:
                if item["slug"] in existing:
                    continue
                new_id = str(uuid.uuid4())
                db.execute(
                    text(
                        'INSERT INTO "Category" (id, name, slug, description, image, "parentId", "createdAt", "updatedAt") '
                        'VALUES (:id, :name, :slug, :description, :image, :parentId, :createdAt, :updatedAt)'
                    ),
                    dict(
                        id=new_id,
                        name=item["name"],
                        slug=item["slug"],
                        description=None,
                        image=None,
                        parentId=girl_id,
                        createdAt=now,
                        updatedAt=now,
                    ),
                )
                added = True
        
        boy_id = existing.get("boy")
        if boy_id:
            for item in boy_subs:
                if item["slug"] in existing:
                    continue
                new_id = str(uuid.uuid4())
                db.execute(
                    text(
                        'INSERT INTO "Category" (id, name, slug, description, image, "parentId", "createdAt", "updatedAt") '
                        'VALUES (:id, :name, :slug, :description, :image, :parentId, :createdAt, :updatedAt)'
                    ),
                    dict(
                        id=new_id,
                        name=item["name"],
                        slug=item["slug"],
                        description=None,
                        image=None,
                        parentId=boy_id,
                        createdAt=now,
                        updatedAt=now,
                    ),
                )
                added = True
        
        if added:
            db.commit()
            logger.info("Seeded base categories")
    except Exception:
        db.rollback()
        logger.exception("seed_base_categories_failed")
    finally:
        db.close()


def init_content_data():
    """Initialize content.json with defaults, using legacy path if available."""
    # Try legacy path first
    data = read_json(LEGACY_CONTENT_PATH)
    
    if data is None:
        # Create new empty structure
        data = {}
    
    now = datetime.utcnow().isoformat()
    data.setdefault("banners", [])
    data.setdefault("promoBanners", [])
    data.setdefault("collections", [])
    data.setdefault("navigation", [])
    data.setdefault("updatedAt", now)
    
    write_json(CONTENT_PATH, data)
    logger.info(f"Initialized content.json at {CONTENT_PATH}")


def init_seo_hidden():
    """Initialize seo_hidden.json with legacy path if available."""
    data = read_json(LEGACY_SEO_HIDDEN_PATH)
    
    if data is None:
        data = {}
    
    write_json(SEO_HIDDEN_PATH, data)
    logger.info(f"Initialized seo_hidden.json at {SEO_HIDDEN_PATH}")


def seed_all():
    """Run all initialization on startup."""
    logger.info("Running content initialization...")
    seed_base_categories()
    init_content_data()
    init_seo_hidden()
    logger.info("Content initialization complete")