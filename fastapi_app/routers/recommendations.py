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
    
    # 1. Similar (Category based)
    similar_ids = []
    if product.categoryId:
        rows = db.execute(
            text('SELECT "B" FROM "_ProductCategories" WHERE "A" = :cat_id AND "B" != :pid LIMIT 12'),
            {"cat_id": product.categoryId, "pid": productId}
        ).fetchall()
        similar_ids = [r[0] for r in rows]
    
    # 2. Set (Complete the look)
    set_rows = db.execute(
        text('SELECT "B" FROM "_ProductSets" WHERE "A" = :pid LIMIT 12'),
        {"pid": productId}
    ).fetchall()
    set_ids = [r[0] for r in set_rows]
    
    # 3. AlsoLike (Related)
    rel_rows = db.execute(
        text('SELECT "B" FROM "_RelatedProducts" WHERE "A" = :pid UNION SELECT "A" FROM "_RelatedProducts" WHERE "B" = :pid LIMIT 12'),
        {"pid": productId}
    ).fetchall()
    rel_ids = [r[0] for r in rel_rows if r[0] != productId]

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
