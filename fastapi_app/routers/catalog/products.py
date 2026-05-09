"""
Products router - CRUD operations for products
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import json

from fastapi_app.database import get_db
from fastapi_app.dependencies import require_admin

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/ai-autofill", dependencies=[Depends(require_admin)])
def ai_autofill(data: dict, db: Session = Depends(get_db)):
    """AI autofill product details from text description"""
    text = data.get("text", "").strip()
    
    if not text:
        raise HTTPException(400, "Text is required")
    
    try:
        from fastapi_app.services.gemini_service import parse_product_autofill
        result = parse_product_autofill(text)
        return result
    except Exception as e:
        raise HTTPException(500, f"AI autofill failed: {str(e)}")


@router.get("")
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    slug: Optional[str] = None,
    sub: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sale: Optional[bool] = None,
    new: Optional[bool] = None,
    sort: Optional[str] = None,
    includeOutOfStock: bool = False,
    db: Session = Depends(get_db),
):
    """Get all products with optional filters"""
    
    # Build category slug to ID mapping
    cat_by_slug = {}
    if slug or sub:
        target_slug = sub or slug
        cat_row = db.execute(
            text('SELECT id, "parentId" FROM "Category" WHERE slug = :slug'),
            {"slug": target_slug}
        ).mappings().first()
        
        if cat_row:
            cat_id = cat_row["id"]
            cat_by_slug[cat_id] = {"id": cat_id, "parentId": cat_row.get("parentId")}
            
            # Get all child category IDs if filtering by parent
            if not sub:
                children = db.execute(
                    text('SELECT id FROM "Category" WHERE "parentId" = :parent_id'),
                    {"parent_id": cat_id}
                ).fetchall()
                for (child_id,) in children:
                    cat_by_slug[child_id] = {"id": child_id, "parentId": cat_id}
    
    query = 'SELECT * FROM "Product"'
    conditions = []
    params = {"limit": limit, "skip": skip}

    if not includeOutOfStock:
        conditions.append('stock > 0')
    
    # Category slug/sub filtering
    if cat_by_slug:
        cat_ids = list(cat_by_slug.keys())
        if len(cat_ids) == 1:
            conditions.append('"categoryId" = :category_id')
            params["category_id"] = cat_ids[0]
        else:
            placeholders = [f":cat_{i}" for i in range(len(cat_ids))]
            conditions.append(f'"categoryId" IN ({",".join(placeholders)})')
            for i, cid in enumerate(cat_ids):
                params[f"cat_{i}"] = cid
    
    if category:
        conditions.append('"categoryId" = :category')
        params['category'] = category
    
    if search:
        conditions.append('(LOWER(name) LIKE :search OR LOWER(description) LIKE :search)')
        params['search'] = f'%{search.lower()}%'
    
    if sale:
        conditions.append('"salePrice" IS NOT NULL AND "salePrice" > 0 AND "salePrice" < price')
    
    if new:
        conditions.append('"createdAt" >= NOW() - INTERVAL \'60 days\'')
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    # Sorting
    if sort == "price_asc":
        query += ' ORDER BY price ASC'
    elif sort == "price_desc":
        query += ' ORDER BY price DESC'
    elif sort == "created_desc":
        query += ' ORDER BY "createdAt" DESC'
    else:
        query += ' ORDER BY "createdAt" DESC'
    
    query += ' LIMIT :limit OFFSET :skip'

    rows = db.execute(text(query), params).mappings().all()
    
    # Get category IDs for each product
    product_ids = [r["id"] for r in rows]
    
    # Fetch categories for each product
    result = []
    for row in rows:
        product = dict(row)
        product_id = product["id"]
        
        # Get categories from junction table
        links = db.execute(
            text('SELECT "A" FROM "_ProductCategories" WHERE "B" = :pid'),
            {"pid": product_id}
        ).fetchall()
        
        categories = []
        for (cid,) in links:
            cat_row = db.execute(
                text('SELECT id, name, slug, description, image, "parentId" FROM "Category" WHERE id = :id'),
                {"id": cid}
            ).mappings().first()
            if cat_row:
                categories.append(dict(cat_row))
        
        # Also add legacy categoryId if present
        legacy_cat_id = product.get("categoryId")
        if legacy_cat_id:
            existing_ids = {c.get("id") for c in categories}
            if legacy_cat_id not in existing_ids:
                cat_row = db.execute(
                    text('SELECT id, name, slug, description, image, "parentId" FROM "Category" WHERE id = :id'),
                    {"id": legacy_cat_id}
                ).mappings().first()
                if cat_row:
                    categories.append(dict(cat_row))
        
        product["categories"] = categories
        result.append(product)
    
    return result


@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by ID with categories"""
    row = db.execute(
        text('SELECT * FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()
    
    if not row:
        raise HTTPException(404, "Product not found")
    
    product = dict(row)
    
    # Fetch categories from _ProductCategories junction table
    links = db.execute(
        text('SELECT "A" FROM "_ProductCategories" WHERE "B" = :pid'),
        {"pid": product_id}
    ).fetchall()
    
    categories = []
    for (cid,) in links:
        cat_row = db.execute(
            text('SELECT id, name, slug, description, image, "parentId" FROM "Category" WHERE id = :id'),
            {"id": cid}
        ).mappings().first()
        if cat_row:
            categories.append(dict(cat_row))
    
    # Also check legacy categoryId field
    legacy_cat_id = product.get("categoryId")
    if legacy_cat_id:
        existing_ids = {c.get("id") for c in categories}
        if legacy_cat_id not in existing_ids:
            cat_row = db.execute(
                text('SELECT id, name, slug, description, image, "parentId" FROM "Category" WHERE id = :id'),
                {"id": legacy_cat_id}
            ).mappings().first()
            if cat_row:
                categories.append(dict(cat_row))
    
    product["categories"] = categories
    return product


@router.post("", dependencies=[Depends(require_admin)])
def create_product(product: dict, db: Session = Depends(get_db)):
    """Create a new product"""
    import uuid
    
    name = product.get('name', '')
    slug = product.get('slug', '')
    price = product.get('price', 0)
    sale_price = product.get('salePrice')
    cost = product.get('cost', 0)
    stock = product.get('stock', 0)
    description = product.get('description', '')
    category_id = product.get('categoryId')
    images = product.get('images', '[]')
    seo_title = product.get('seoTitle', '')
    seo_description = product.get('seoDescription', '')
    gender = product.get('gender', '')
    category_ids = product.get('categoryIds', [])
    
    if not name:
        raise HTTPException(400, "Name is required")
    
    product_id = str(uuid.uuid4())
    
    if not slug:
        from fastapi_app.services.slug_service import build_product_slug, ensure_unique_product_slug
        base_slug = build_product_slug(name, slug)
        slug = ensure_unique_product_slug(db, base_slug)
    
    result = db.execute(
        text('''
            INSERT INTO "Product" 
            (id, name, slug, price, "salePrice", cost, stock, description, "categoryId", images, "seoTitle", "seoDescription", gender, "createdAt", "updatedAt")
            VALUES (:id, :name, :slug, :price, :sale_price, :cost, :stock, :description, :category_id, :images, :seo_title, :seo_description, :gender, NOW(), NOW())
            RETURNING *
        '''),
        {
            'id': product_id,
            'name': name,
            'slug': slug,
            'price': price,
            'sale_price': sale_price,
            'cost': cost,
            'stock': stock,
            'description': description,
            'category_id': category_id,
            'images': images if isinstance(images, str) else json.dumps(images),
            'seo_title': seo_title,
            'seo_description': seo_description,
            'gender': gender or None,
        }
    ).mappings().first()
    
    if category_ids and isinstance(category_ids, list):
        for cat_id in category_ids:
            if cat_id:
                db.execute(
                    text('INSERT INTO "_ProductCategories" ("A", "B") VALUES (:category_id, :product_id)'),
                    {'category_id': cat_id, 'product_id': product_id}
                )
    
    db.commit()
    return dict(result)


@router.put("/{product_id}", dependencies=[Depends(require_admin)])
def update_product(product_id: str, product: dict, db: Session = Depends(get_db)):
    """Update a product"""
    existing = db.execute(
        text('SELECT id FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).first()
    
    if not existing:
        raise HTTPException(404, "Product not found")
    
    updates = []
    params = {'id': product_id}
    
    allowed_fields = {
        'name': 'name',
        'slug': 'slug',
        'price': 'price',
        'salePrice': 'sale_price',
        'cost': 'cost',
        'stock': 'stock',
        'description': 'description',
        'categoryId': 'category_id',
        'images': 'images',
        'seoTitle': 'seo_title',
        'seoDescription': 'seo_description',
        'gender': 'gender',
        'isArchived': 'is_archived',
    }
    
    for field, param_name in allowed_fields.items():
        if field in product:
            value = product[field]
            if field == 'images' and not isinstance(value, str):
                value = json.dumps(value)
            updates.append(f'"{field}" = :{param_name}')
            params[param_name] = value
    
    if not updates:
        raise HTTPException(400, "No fields to update")
    
    category_ids = product.get('categoryIds')
    if category_ids and isinstance(category_ids, list):
        db.execute(
            text('DELETE FROM "_ProductCategories" WHERE "B" = :product_id'),
            {'product_id': product_id}
        )
        for cat_id in category_ids:
            if cat_id:
                db.execute(
                    text('INSERT INTO "_ProductCategories" ("A", "B") VALUES (:category_id, :product_id)'),
                    {'category_id': cat_id, 'product_id': product_id}
                )
    
    query = f'UPDATE "Product" SET {", ".join(updates)} WHERE id = :id RETURNING *'
    result = db.execute(text(query), params).mappings().first()
    db.commit()
    
    return dict(result)


@router.delete("/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: str, db: Session = Depends(get_db)):
    """Delete a product"""
    result = db.execute(
        text('DELETE FROM "Product" WHERE id = :id RETURNING id'),
        {"id": product_id}
    ).first()
    
    if not result:
        raise HTTPException(404, "Product not found")
    
    db.commit()
    return {"success": True, "id": product_id}


@router.get("/{product_id}/related")
def get_related_products(product_id: str, db: Session = Depends(get_db)):
    """Get related products and set products"""
    product = db.execute(
        text('SELECT id FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).first()
    
    if not product:
        raise HTTPException(404, "Product not found")
    
    return {"relatedProductIds": [], "setProductIds": []}


@router.put("/{product_id}/related", dependencies=[Depends(require_admin)])
def update_related_products(product_id: str, data: dict, db: Session = Depends(get_db)):
    """Update related products and set products"""
    product = db.execute(
        text('SELECT id FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).first()
    
    if not product:
        raise HTTPException(404, "Product not found")
    
    return {"success": True}


@router.get("/{product_id}/measurements")
def get_measurements(product_id: str, db: Session = Depends(get_db)):
    """Get product measurements"""
    product = db.execute(
        text('SELECT id, measurements FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()

    if not product:
        raise HTTPException(404, "Product not found")

    measurements = product.get("measurements") or {}
    return {"measurements": measurements}


@router.put("/{product_id}/measurements", dependencies=[Depends(require_admin)])
def update_measurements(product_id: str, measurements: dict, db: Session = Depends(get_db)):
    """Update product measurements"""
    product = db.execute(
        text('SELECT id FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).first()

    if not product:
        raise HTTPException(404, "Product not found")

    import json
    db.execute(
        text('UPDATE "Product" SET measurements = :m WHERE id = :id'),
        {"m": json.dumps(measurements), "id": product_id}
    )
    db.commit()
    return {"success": True}


