from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import text

from ..database import get_db
from ..models import Product
from ..schemas import ProductOut, RecommendationRes

router = APIRouter(prefix="/api/v1/products", tags=["recommendations"])

def _get_product_out(product_id: str, db: Session) -> ProductOut | None:
    product = (
        db.query(Product)
        .options(selectinload(Product.categories))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        return None
    return ProductOut.model_validate(product, from_attributes=True)

@router.get("/{productId}/recommendations", response_model=RecommendationRes)
def get_product_recommendations(productId: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="product_not_found")
    
    # ── 1. Similar (Category based) ──────────────────────────────────────────
    similar_ids = []
    
    if product.categoryId:
        # 1a. Try Prisma many-to-many table
        rows = db.execute(
            text('SELECT "B" FROM "_ProductCategories" WHERE "A" = :cat_id AND "B" != :pid LIMIT 12'),
            {"cat_id": product.categoryId, "pid": productId}
        ).fetchall()
        similar_ids = [r[0] for r in rows]
        
        # 1b. Fallback: same categoryId (legacy)
        if not similar_ids:
            cat_rows = db.execute(
                text('SELECT id FROM "Product" WHERE "categoryId" = :cat_id AND id != :pid AND "isArchived" = false AND stock > 0 LIMIT 12'),
                {"cat_id": product.categoryId, "pid": productId}
            ).fetchall()
            similar_ids = [r[0] for r in cat_rows]
        
        # 1c. Still empty → find products from sibling categories (same parent)
        if not similar_ids:
            parent_row = db.execute(
                text('SELECT "parentId" FROM "Category" WHERE id = :cat_id'),
                {"cat_id": product.categoryId}
            ).first()
            
            if parent_row and parent_row[0]:
                # Has parent → get products from sibling categories
                sib_rows = db.execute(
                    text('''
                        SELECT p.id FROM "Product" p
                        JOIN "Category" c ON p."categoryId" = c.id
                        WHERE c."parentId" = :parent_id
                        AND p.id != :pid
                        AND p."isArchived" = false
                        AND p.stock > 0
                        LIMIT 12
                    '''),
                    {"parent_id": parent_row[0], "pid": productId}
                ).fetchall()
                similar_ids = [r[0] for r in sib_rows]
            else:
                # Is top-level → get products from child categories
                child_rows = db.execute(
                    text('''
                        SELECT p.id FROM "Product" p
                        JOIN "Category" c ON p."categoryId" = c.id
                        WHERE c."parentId" = :cat_id
                        AND p.id != :pid
                        AND p."isArchived" = false
                        AND p.stock > 0
                        LIMIT 12
                    '''),
                    {"cat_id": product.categoryId, "pid": productId}
                ).fetchall()
                similar_ids = [r[0] for r in child_rows]
        
        # 1d. Still empty → get any other in-stock products (broadest fallback)
        if not similar_ids:
            any_rows = db.execute(
                text('''
                    SELECT id FROM "Product"
                    WHERE id != :pid AND "isArchived" = false AND stock > 0
                    ORDER BY RANDOM()
                    LIMIT 12
                '''),
                {"pid": productId}
            ).fetchall()
            similar_ids = [r[0] for r in any_rows]
    
    # If no categoryId at all → random products
    if not similar_ids:
        any_rows = db.execute(
            text('''
                SELECT id FROM "Product"
                WHERE id != :pid AND "isArchived" = false AND stock > 0
                ORDER BY RANDOM()
                LIMIT 12
            '''),
            {"pid": productId}
        ).fetchall()
        similar_ids = [r[0] for r in any_rows]
    
    # ── 2. Set (Complete the look) ───────────────────────────────────────────
    set_ids = []
    
    set_rows = db.execute(
        text('SELECT "B" FROM "_ProductSets" WHERE "A" = :pid LIMIT 12'),
        {"pid": productId}
    ).fetchall()
    set_ids = [r[0] for r in set_rows]
    
    if not set_ids and product.categoryId:
        parent_row = db.execute(
            text('SELECT "parentId" FROM "Category" WHERE id = :cat_id'),
            {"cat_id": product.categoryId}
        ).first()
        
        if parent_row and parent_row[0]:
            parent_rows = db.execute(
                text('''
                    SELECT p.id FROM "Product" p
                    JOIN "Category" c ON p."categoryId" = c.id
                    WHERE c."parentId" = :parent_id
                    AND p.id != :pid
                    AND p."isArchived" = false
                    AND p.stock > 0
                    LIMIT 12
                '''),
                {"parent_id": parent_row[0], "pid": productId}
            ).fetchall()
            set_ids = [r[0] for r in parent_rows]
        else:
            child_rows = db.execute(
                text('''
                    SELECT p.id FROM "Product" p
                    JOIN "Category" c ON p."categoryId" = c.id
                    WHERE c."parentId" = :cat_id
                    AND p.id != :pid
                    AND p."isArchived" = false
                    AND p.stock > 0
                    LIMIT 12
                '''),
                {"cat_id": product.categoryId, "pid": productId}
            ).fetchall()
            set_ids = [r[0] for r in child_rows]
    
    if not set_ids:
        any_rows = db.execute(
            text('''
                SELECT id FROM "Product"
                WHERE id != :pid AND "isArchived" = false AND stock > 0
                ORDER BY RANDOM()
                LIMIT 12
            '''),
            {"pid": productId}
        ).fetchall()
        set_ids = [r[0] for r in any_rows]
    
    # ── 3. AlsoLike (Related / Price based) ──────────────────────────────────
    rel_ids = []
    
    rel_rows = db.execute(
        text('SELECT "B" FROM "_RelatedProducts" WHERE "A" = :pid UNION SELECT "A" FROM "_RelatedProducts" WHERE "B" = :pid LIMIT 12'),
        {"pid": productId}
    ).fetchall()
    rel_ids = [r[0] for r in rel_rows if r[0] != productId]
    
    if not rel_ids:
        price = float(product.price) if product.price else 0
        price_range = max(price * 0.5, 30)
        rel_fallback = db.execute(
            text('''
                SELECT id FROM "Product"
                WHERE id != :pid
                AND "isArchived" = false
                AND stock > 0
                AND price BETWEEN :min_price AND :max_price
                LIMIT 8
            '''),
            {"pid": productId, "min_price": price - price_range, "max_price": price + price_range}
        ).fetchall()
        rel_ids = [r[0] for r in rel_fallback]
    
    if not rel_ids:
        any_rows = db.execute(
            text('''
                SELECT id FROM "Product"
                WHERE id != :pid AND "isArchived" = false AND stock > 0
                ORDER BY RANDOM()
                LIMIT 8
            '''),
            {"pid": productId}
        ).fetchall()
        rel_ids = [r[0] for r in any_rows]

    # ── Fetch products ───────────────────────────────────────────────────────
    def fetch_products(ids):
        if not ids:
            return []
        results = []
        for pid in ids:
            if pid == productId:
                continue
            p_out = _get_product_out(pid, db)
            if p_out:
                results.append(p_out)
        return results

    return {
        "similar": fetch_products(similar_ids),
        "set": fetch_products(set_ids),
        "alsoLike": fetch_products(rel_ids)
    }
