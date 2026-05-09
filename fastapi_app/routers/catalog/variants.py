"""
routers/variants.py — Product variants, barcodes, POS, inventory.

Fix: in original main.py the @app.post("/variants/sync") decorator
was applied to list_variants instead of variants_sync. Fixed here —
routes registered correctly.
"""
import uuid
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi_app.database import get_db
from fastapi_app.dependencies import get_current_user, require_admin

router = APIRouter(tags=["variants"])
logger = logging.getLogger(__name__)


def _v_to_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


def _variant_row(r: dict) -> dict:
    """Нормализует строку варианта из БД."""
    d = dict(r)
    for field in ("price", "salePrice", "cost"):
        if d.get(field) is not None:
            try:
                d[field] = float(d[field])
            except Exception:
                pass
    return d


# ── GET /variants ─────────────────────────────────────────────────────────────

@router.get("/variants")
@router.get("/api/v1/variants")
def list_variants(productId: str | None = None, db: Session = Depends(get_db)):
    if productId:
        rows = db.execute(
            text('SELECT * FROM "ProductVariant" WHERE "productId"=:pid ORDER BY "createdAt" ASC'),
            {"pid": productId},
        ).mappings().all()
    else:
        rows = db.execute(
            text('SELECT * FROM "ProductVariant" ORDER BY "createdAt" ASC')
        ).mappings().all()
    return [_variant_row(r) for r in rows]


# ── POST /variants/batch —— Batch create/update variants ──

@router.post("/variants/batch")
@router.post("/api/v1/variants/batch")
def variants_batch(payload: dict[str, Any], db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """
    Batch create/update variants for a product.
    payload: {"productId": "", "variants": []}
    """
    return variants_sync(payload, db, user)


# ── POST /variants/sync —— ИСПРАВЛЕНО (в main.py этот роут вёл на list_variants) ──

@router.post("/variants/sync")
def variants_sync(payload: dict[str, Any], db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """
    Синхронизирует список вариантов для одного продукта.
    payload: {"productId": "", "variants": []}
    """
    product_id = str(payload.get("productId") or "").strip()
    variants: list = payload.get("variants") or []

    if not product_id:
        raise HTTPException(status_code=400, detail="productId required")

    # Проверяем существование продукта
    prow = db.execute(
        text('SELECT id FROM "Product" WHERE id=:id'), {"id": product_id}
    ).mappings().first()
    if not prow:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.utcnow().isoformat()
    existing = db.execute(
        text('SELECT id FROM "ProductVariant" WHERE "productId"=:pid'), {"pid": product_id}
    ).mappings().all()
    existing_ids = {str(r["id"]) for r in existing}
    payload_ids: set[str] = set()

    for v in variants:
        vid = str(v.get("id") or "").strip()
        if not vid:
            vid = str(uuid.uuid4())

        price = _v_to_float(v.get("price"))
        sale_price = _v_to_float(v.get("salePrice"))
        cost = _v_to_float(v.get("cost")) or 0.0
        stock = int(v.get("stock") or 0)
        size = str(v.get("size") or "").strip() or None
        color = str(v.get("color") or "").strip() or None
        sku = str(v.get("sku") or "").strip() or None
        
        # Auto-generate SKU if not provided
        if not sku:
            sku_parts = [product_id[:8]]
            if size:
                sku_parts.append(size)
            if color:
                # Use first 6 chars of color or hex code
                color_code = color.replace('#', '')[:6]
                sku_parts.append(color_code)
            sku = '-'.join(sku_parts).upper()
        
        barcode = str(v.get("barcode") or "").strip() or None
        images = v.get("images")
        if isinstance(images, list):
            images = json.dumps(images)

        if vid in existing_ids:
            db.execute(
                text(
                    'UPDATE "ProductVariant" SET '
                    'size=:size,color=:color,sku=:sku,barcode=:barcode,'
                    'price=:price,"salePrice"=:salePrice,cost=:cost,'
                    'stock=:stock,images=:images,"updatedAt"=:u '
                    'WHERE id=:id AND "productId"=:pid'
                ),
                dict(
                    id=vid, pid=product_id, size=size, color=color, sku=sku,
                    barcode=barcode, price=price, salePrice=sale_price,
                    cost=cost, stock=stock, images=images, u=now,
                ),
            )
        else:
            db.execute(
                text(
                    'INSERT INTO "ProductVariant" '
                    '(id,"productId",size,color,sku,barcode,price,"salePrice",cost,stock,images,"createdAt","updatedAt") '
                    'VALUES (:id,:pid,:size,:color,:sku,:barcode,:price,:salePrice,:cost,:stock,:images,:c,:u)'
                ),
                dict(
                    id=vid, pid=product_id, size=size, color=color, sku=sku,
                    barcode=barcode, price=price, salePrice=sale_price,
                    cost=cost, stock=stock, images=images, c=now, u=now,
                ),
            )
        payload_ids.add(vid)

    # Удаляем варианты которых нет в payload
    to_delete = existing_ids - payload_ids
    for did in to_delete:
        db.execute(text('DELETE FROM "ProductVariant" WHERE id=:id'), {"id": did})

    db.commit()
    return list_variants(productId=product_id, db=db)


# ── GET /variants/{variant_id} ────────────────────────────────────────────────

@router.get("/variants/{variant_id}")
def get_variant(variant_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text('SELECT * FROM "ProductVariant" WHERE id=:id'), {"id": variant_id}
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Variant not found")
    return _variant_row(row)


# ── PUT /variants/{variant_id} ────────────────────────────────────────────────

@router.put("/variants/{variant_id}")
def update_variant(
    variant_id: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    row = db.execute(
        text('SELECT id FROM "ProductVariant" WHERE id=:id'), {"id": variant_id}
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Variant not found")

    now = datetime.utcnow().isoformat()
    allowed = {"size", "color", "sku", "barcode", "price", "salePrice", "cost", "stock", "images"}
    parts: list[str] = []
    params: dict = {"id": variant_id, "u": now}

    for key, val in payload.items():
        if key not in allowed:
            continue
        col = f'"{key}"' if key in ("salePrice",) else key
        parts.append(f"{col}=:{key}")
        if key in ("price", "salePrice", "cost"):
            params[key] = _v_to_float(val)
        elif key == "stock":
            params[key] = int(val or 0)
        else:
            params[key] = val

    if not parts:
        return get_variant(variant_id, db)

    parts.append('"updatedAt"=:u')
    db.execute(text(f'UPDATE "ProductVariant" SET {", ".join(parts)} WHERE id=:id'), params)
    db.commit()
    return get_variant(variant_id, db)


# ── DELETE /variants/{variant_id} ─────────────────────────────────────────────

@router.delete("/variants/{variant_id}")
def delete_variant(
    variant_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    row = db.execute(
        text('SELECT id FROM "ProductVariant" WHERE id=:id'), {"id": variant_id}
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.execute(text('DELETE FROM "ProductVariant" WHERE id=:id'), {"id": variant_id})
    db.commit()
    return {"ok": True}


# ── GET /barcodes/lookup ──────────────────────────────────────────────────────

@router.get("/barcodes/lookup")
def barcode_lookup(barcode: str, db: Session = Depends(get_db)):
    """Ищет вариант по штрих-коду."""
    row = db.execute(
        text(
            'SELECT v.*, p.name AS productName, p.images AS productImages, p.price AS productPrice '
            'FROM "ProductVariant" v '
            'JOIN "Product" p ON p.id = v."productId" '
            'WHERE v.barcode=:b LIMIT 1'
        ),
        {"b": str(barcode).strip()},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Barcode not found")

    d = _variant_row(row)
    d["product"] = {
        "id": d.get("productId"),
        "name": d.get("productName"),
        "images": d.get("productImages"),
        "price": _v_to_float(d.get("productPrice")),
    }
    return d


# ── GET /pos/search ───────────────────────────────────────────────────────────

@router.get("/pos/search")
def pos_search(q: str | None = None, barcode: str | None = None, db: Session = Depends(get_db)):
    """Поиск для POS-системы — по штрих-коду или имени продукта."""
    if barcode:
        try:
            return barcode_lookup(barcode, db)
        except HTTPException:
            pass

    if not q or len(str(q).strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short")

    q_clean = f"%{str(q).strip()}%"
    rows = db.execute(
        text(
            'SELECT v.*, p.name AS productName, p.images AS productImages, p.price AS productPrice '
            'FROM "ProductVariant" v '
            'JOIN "Product" p ON p.id = v."productId" '
            'WHERE p.name ILIKE :q OR v.sku ILIKE :q OR v.barcode ILIKE :q '
            'LIMIT 20'
        ),
        {"q": q_clean},
    ).mappings().all()

    result = []
    for row in rows:
        d = _variant_row(row)
        d["product"] = {
            "id": d.get("productId"),
            "name": d.get("productName"),
            "images": d.get("productImages"),
            "price": _v_to_float(d.get("productPrice")),
        }
        result.append(d)
    return result


# ── POST /inventory/movements ─────────────────────────────────────────────────

@router.post("/inventory/movements")
def create_inventory_movement(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    """Изменение остатков на складе."""
    variant_id = str(payload.get("variantId") or "").strip()
    store_id = str(payload.get("storeId") or "").strip() or None
    movement_type = str(payload.get("type") or "ADJUSTMENT").upper()
    quantity = int(payload.get("quantity") or 0)
    note = str(payload.get("note") or "").strip() or None

    allowed_types = {"IN", "OUT", "ADJUSTMENT", "TRANSFER"}
    if movement_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"type must be one of {allowed_types}")
    if not variant_id:
        raise HTTPException(status_code=400, detail="variantId required")

    vrow = db.execute(
        text('SELECT id, stock FROM "ProductVariant" WHERE id=:id'), {"id": variant_id}
    ).mappings().first()
    if not vrow:
        raise HTTPException(status_code=404, detail="Variant not found")

    current_stock = int(vrow.get("stock") or 0)
    if movement_type == "IN":
        new_stock = current_stock + abs(quantity)
    elif movement_type == "OUT":
        new_stock = max(0, current_stock - abs(quantity))
    else:
        new_stock = quantity  # ADJUSTMENT sets absolute value

    now = datetime.utcnow().isoformat()
    db.execute(
        text('UPDATE "ProductVariant" SET stock=:s, "updatedAt"=:u WHERE id=:id'),
        {"s": new_stock, "u": now, "id": variant_id},
    )

    # Сохраняем движение если таблица InventoryMovement существует
    try:
        mid = str(uuid.uuid4())
        db.execute(
            text(
                'INSERT INTO "InventoryMovement" (id,"variantId","storeId",type,quantity,"previousStock","newStock",note,"createdAt") '
                'VALUES (:id,:vid,:sid,:t,:q,:ps,:ns,:n,:c)'
            ),
            dict(
                id=mid, vid=variant_id, sid=store_id, t=movement_type,
                q=quantity, ps=current_stock, ns=new_stock, n=note, c=now,
            ),
        )
    except Exception:
        pass  # таблица может не существовать

    db.commit()
    return {
        "variantId": variant_id,
        "type": movement_type,
        "quantity": quantity,
        "previousStock": current_stock,
        "newStock": new_stock,
    }
