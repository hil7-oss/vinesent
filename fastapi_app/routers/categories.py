"""Categories router - CRUD operations for categories"""
import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


from ..core.cache import cache_get, cache_set, cache_del


def slugify_value(value: str):
    """Slugify Ukrainian/Russian text to URL-safe format"""
    import re
    _slug_map = {
        "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ye",
        "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "yi", "й": "y", "к": "k", "л": "l",
        "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "",
        "ю": "yu", "я": "ya",
        "А": "a", "Б": "b", "В": "v", "Г": "h", "Ґ": "g", "Д": "d", "Е": "e", "Є": "ye",
        "Ж": "zh", "З": "z", "И": "y", "І": "i", "Ї": "yi", "Й": "y", "К": "k", "Л": "l",
        "М": "m", "Н": "n", "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "У": "u",
        "Ф": "f", "Х": "kh", "Ц": "ts", "Ч": "ch", "Ш": "sh", "Щ": "shch", "Ь": "",
        "Ю": "yu", "Я": "ya",
        "ё": "yo", "Ё": "yo", "ы": "y", "Ы": "y", "э": "e", "Э": "e", "ъ": "", "Ъ": "",
    }
    if not value:
        return ""
    normalized = "".join(_slug_map.get(ch, ch) for ch in value.strip()).lower()
    return re.sub(r"(^-+)|(-+$)", "", re.sub(r"[^a-z0-9]+", "-", normalized))


def ensure_unique_category_slug(db: Session, base: str, exclude_id: str | None = None):
    if not base:
        base = "category"
    slug = base
    idx = 2
    while True:
        if exclude_id:
            row = db.execute(
                text('SELECT id FROM "Category" WHERE slug=:s AND id<>:id LIMIT 1'),
                {"s": slug, "id": exclude_id},
            ).mappings().first()
        else:
            row = db.execute(
                text('SELECT id FROM "Category" WHERE slug=:s LIMIT 1'),
                {"s": slug},
            ).mappings().first()
        if not row:
            return slug
        slug = f"{base}-{idx}"
        idx += 1


@router.get("", response_model=list[CategoryOut])
@router.get("/", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    key = "categories:list"
    cached = cache_get(key, ttl_s=2.0)
    if cached is not None:
        return cached
    
    # Fetch categories
    q = text('SELECT id,name,slug,description,image,"parentId" FROM "Category"')
    res = db.execute(q).mappings().all()
    
    direct_map: dict[str, set[str]] = {}
    valid_pids = {str(r["id"]) for r in db.execute(text('SELECT id FROM "Product"')).mappings().all()}
    links = db.execute(text('SELECT "A", "B" FROM "_ProductCategories"')).fetchall()
    for cid, pid in links:
        if not cid or not pid:
            continue
        if str(pid) in valid_pids:
            direct_map.setdefault(cid, set()).add(str(pid))
    
    legacy = db.execute(text('SELECT id, "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL AND "categoryId" <> \'\'')).fetchall()
    for pid, cid in legacy:
        if not cid or not pid:
            continue
        if str(pid) in valid_pids:
            direct_map.setdefault(cid, set()).add(str(pid))
    
    children_by_parent: dict[str, list[str]] = {}
    for row in res:
        parent_id = row.get("parentId")
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(row["id"])
    
    count_map: dict[str, int] = {}
    slug_map = {row["id"]: str(row.get("slug") or "").lower() for row in res}
    
    # Special handling for SALE and NEW categories
    sale_count = db.execute(text("""
        SELECT COUNT(DISTINCT p.id) AS c
        FROM "Product" p
        LEFT JOIN "ProductVariant" v ON v."productId" = p.id
        WHERE COALESCE(p."salePrice", 0) > 0 OR COALESCE(v."salePrice", 0) > 0
    """)).mappings().first().get("c", 0)
    
    th = (datetime.utcnow() - timedelta(days=60))
    th_sql = th.isoformat()
    new_count = db.execute(text("""
        SELECT COUNT(*) AS c
        FROM "Product"
        WHERE "createdAt" >= :th
    """), {"th": th_sql}).mappings().first().get("c", 0)
    
    for row in res:
        root_id = row["id"]
        stack = [root_id]
        all_ids: set[str] = set()
        while stack:
            current = stack.pop()
            all_ids |= direct_map.get(current, set())
            stack.extend(children_by_parent.get(current, []))
        
        if slug_map.get(root_id) == "sale":
            count_map[root_id] = int(sale_count)
        elif slug_map.get(root_id) == "new":
            count_map[root_id] = int(new_count)
        else:
            count_map[root_id] = len(all_ids)
    
    out = []
    for r in res:
        d = dict(r)
        d['productCount'] = count_map.get(d['id'], 0)
        out.append(CategoryOut(**d))
    
    cache_set(key, out)
    return out


@router.post("", response_model=CategoryOut)
@router.post("/", response_model=CategoryOut)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    raw_slug = str(payload.slug or "").strip()
    base_slug = slugify_value(raw_slug) if raw_slug else slugify_value(payload.name or "")
    
    if str(base_slug or "").strip().lower() in {"sale", "new"}:
        raise HTTPException(status_code=400, detail="Reserved category cannot be created")
    
    slug = base_slug or f"cat-{uuid.uuid4().hex[:8]}"
    if db.execute(text('SELECT 1 FROM "Category" WHERE slug=:s LIMIT 1'), {"s": slug}).mappings().first():
        slug = ensure_unique_category_slug(db, slug)
    
    new_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    ins = text('INSERT INTO "Category" (id, name, slug, description, image, "parentId", "createdAt", "updatedAt") VALUES (:id, :name, :slug, :description, :image, :parentId, :createdAt, :updatedAt)')
    db.execute(ins, dict(
        id=new_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        image=payload.image,
        parentId=payload.parentId,
        createdAt=now,
        updatedAt=now
    ))
    db.commit()
    
    sel = text('SELECT id,name,slug,description,image,"parentId" FROM "Category" WHERE id=:id')
    row = db.execute(sel, dict(id=new_id)).mappings().first()
    
    cache_del("categories")
    return CategoryOut(**dict(row))


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: str, db: Session = Depends(get_db)):
    sel = text('SELECT id,name,slug,description,image,"parentId" FROM "Category" WHERE id=:id')
    row = db.execute(sel, dict(id=category_id)).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategoryOut(**dict(row))


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: str, payload: CategoryUpdate, db: Session = Depends(get_db)):
    sel = text('SELECT id,name,slug,description,image,"parentId" FROM "Category" WHERE id=:id')
    row = db.execute(sel, dict(id=category_id)).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    
    data = dict(row)
    current_slug = str(data.get("slug") or "").strip().lower()
    
    if current_slug in {"sale", "new"}:
        raise HTTPException(status_code=400, detail="Reserved category cannot be updated")
    
    if payload.slug and payload.slug != data["slug"]:
        candidate = slugify_value(str(payload.slug or "").strip())
        if str(candidate or "").strip().lower() in {"sale", "new"}:
            raise HTTPException(status_code=400, detail="Reserved category cannot be used")
        if not candidate:
            candidate = f"cat-{uuid.uuid4().hex[:8]}"
        if db.execute(text('SELECT 1 FROM "Category" WHERE slug=:s AND id<>:id LIMIT 1'), {"s": candidate, "id": category_id}).mappings().first():
            candidate = ensure_unique_category_slug(db, candidate, exclude_id=category_id)
        data["slug"] = candidate
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        data[field] = value
    
    upd = text(
        'UPDATE "Category" SET name=:name,slug=:slug,description=:description,image=:image,"parentId"=:parentId,"updatedAt"=:updatedAt WHERE id=:id'
    )
    db.execute(
        upd,
        dict(
            id=category_id,
            name=data.get("name"),
            slug=data.get("slug"),
            description=data.get("description"),
            image=data.get("image"),
            parentId=data.get("parentId"),
            updatedAt=datetime.utcnow().isoformat(),
        ),
    )
    db.commit()
    
    row = db.execute(sel, dict(id=category_id)).mappings().first()
    cache_del("categories")
    return CategoryOut(**dict(row))


@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    sel = text('SELECT id,slug FROM "Category" WHERE id=:id')
    row = db.execute(sel, dict(id=category_id)).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    
    slug = str(row.get("slug") or "").strip().lower()
    if slug in {"sale", "new"}:
        raise HTTPException(status_code=400, detail="Reserved category cannot be deleted")
    
    db.execute(text('DELETE FROM "_ProductCategories" WHERE "A"=:id'), {"id": category_id})
    db.execute(text('DELETE FROM "Category" WHERE id=:id'), {"id": category_id})
    db.commit()
    
    cache_del("categories")
    return Response(status_code=204)
