"""
services/slug_service.py — Генерация и валидация slug'ов.
Поддерживает украинскую и русскую транслитерацию.
"""
import re
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

SLUG_MAP: dict[str, str] = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d",
    "е": "e", "є": "ye", "ж": "zh", "з": "z", "и": "y", "і": "i",
    "ї": "yi", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ь": "", "ю": "yu", "я": "ya",
    "А": "a", "Б": "b", "В": "v", "Г": "h", "Ґ": "g", "Д": "d",
    "Е": "e", "Є": "ye", "Ж": "zh", "З": "z", "И": "y", "І": "i",
    "Ї": "yi", "Й": "y", "К": "k", "Л": "l", "М": "m", "Н": "n",
    "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "У": "u",
    "Ф": "f", "Х": "kh", "Ц": "ts", "Ч": "ch", "Ш": "sh", "Щ": "shch",
    "Ь": "", "Ю": "yu", "Я": "ya",
    "ё": "yo", "Ё": "yo", "ы": "y", "Ы": "y",
    "э": "e", "Э": "e", "ъ": "", "Ъ": "",
}


def slugify(value: str) -> str:
    """Транслитерирует и нормализует строку в URL-safe slug."""
    if not value:
        return ""
    normalized = "".join(SLUG_MAP.get(ch, ch) for ch in value.strip()).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return re.sub(r"(^-+)|(-+$)", "", slug)


def build_product_slug(name: str, raw_slug: str | None) -> str:
    """Строит slug из имени или кастомного значения."""
    if raw_slug and raw_slug.strip():
        base = slugify(raw_slug)
        if base:
            return base
    base = slugify(name or "")
    if not base:
        return f"prod-{uuid.uuid4().hex[:8]}"
    return base


def ensure_unique_product_slug(db: Session, base: str, exclude_id: str | None = None) -> str:
    """Добавляет числовой суффикс если slug уже занят."""
    if not base:
        base = "product"
    slug = base
    idx = 2
    while True:
        if exclude_id:
            row = db.execute(
                text('SELECT id FROM "Product" WHERE slug=:s AND id<>:id LIMIT 1'),
                {"s": slug, "id": exclude_id}
            ).mappings().first()
        else:
            row = db.execute(
                text('SELECT id FROM "Product" WHERE slug=:s LIMIT 1'),
                {"s": slug}
            ).mappings().first()
        if not row:
            return slug
        slug = f"{base}-{idx}"
        idx += 1


def ensure_unique_category_slug(db: Session, base: str, exclude_id: str | None = None) -> str:
    """Аналог для Category."""
    if not base:
        base = "category"
    slug = base
    idx = 2
    while True:
        if exclude_id:
            row = db.execute(
                text('SELECT id FROM "Category" WHERE slug=:s AND id<>:id LIMIT 1'),
                {"s": slug, "id": exclude_id}
            ).mappings().first()
        else:
            row = db.execute(
                text('SELECT id FROM "Category" WHERE slug=:s LIMIT 1'),
                {"s": slug}
            ).mappings().first()
        if not row:
            return slug
        slug = f"{base}-{idx}"
        idx += 1