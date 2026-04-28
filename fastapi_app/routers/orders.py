"""
routers/orders.py — Управление заказами.
"""
import uuid
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..dependencies import get_current_user, require_admin

router = APIRouter(tags=["orders"])
logger = logging.getLogger(__name__)

_ORDER_SELECT = (
    'SELECT id,"userId",status,"paymentMethod",source,total,"createdAt","updatedAt",'
    '"customerFirstName","customerLastName",'
    '"customerPhone" AS customerPhone,'
    '"customerEmail" AS customerEmail,'
    "TRIM(COALESCE(\"customerFirstName\",'') || ' ' || COALESCE(\"customerLastName\",'')) AS customerName,"
    '"deliveryMethod","deliveryCity","deliveryBranch","deliveryAddress","pickupLocationId",'
    'CASE '
    "WHEN \"deliveryMethod\"='nova_branch' THEN TRIM(COALESCE(\"deliveryCity\",'') || CASE WHEN COALESCE(\"deliveryBranch\",'')<>'' THEN ', '||\"deliveryBranch\" ELSE '' END) "
    "WHEN \"deliveryMethod\"='nova_courier' THEN TRIM(COALESCE(\"deliveryCity\",'') || CASE WHEN COALESCE(\"deliveryAddress\",'')<>'' THEN ', '||\"deliveryAddress\" ELSE '' END) "
    "WHEN \"deliveryMethod\"='pickup' THEN (SELECT TRIM(COALESCE(name,'') || CASE WHEN COALESCE(address,'')<>'' THEN ', '||address ELSE '' END) FROM \"Store\" WHERE id=\"pickupLocationId\") "
    "ELSE TRIM(COALESCE(\"deliveryAddress\",'')) "
    'END AS customerAddress '
)


def _order_items(db: Session, order_id: str) -> list[dict]:
    items = db.execute(
        text("""
            SELECT
                oi.id, oi."orderId", oi."productId", oi."variantId", oi.quantity, oi.price,
                p.name AS name, p.slug AS slug, p.images AS product_images,
                v.size AS size, v.color AS color, v.images AS variant_images
            FROM "OrderItem" oi
            LEFT JOIN "Product" p ON p.id = oi."productId"
            LEFT JOIN "ProductVariant" v ON v.id = oi."variantId"
            WHERE oi."orderId" = :oid
        """),
        {"oid": order_id},
    ).mappings().all()

    out = []
    for it in items:
        d = dict(it)
        try:
            d["price"] = float(d.get("price") or 0)
        except Exception:
            pass

        def pick_first(raw):
            if not raw:
                return None
            try:
                parsed = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(parsed, list) and parsed:
                    return parsed[0]
                if isinstance(parsed, str) and parsed:
                    return parsed
            except Exception:
                pass
            return raw if isinstance(raw, str) and raw.strip() else None

        d["image"] = pick_first(d.get("variant_images")) or pick_first(d.get("product_images"))
        d.pop("product_images", None)
        d.pop("variant_images", None)
        out.append(d)
    return out


def _row_to_order(db: Session, row) -> dict:
    o = dict(row)
    try:
        o["total"] = float(o.get("total") or 0)
    except Exception:
        pass
    o["items"] = _order_items(db, o["id"])
    return o


# ── GET /orders ───────────────────────────────────────────────────────────────

@router.get("/orders")
def list_orders(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    where = ""
    params: dict = {}
    if user.get("role") != "ADMIN":
        where = 'WHERE "userId"=:uid'
        params["uid"] = user.get("sub")

    rows = db.execute(
        text(f'{_ORDER_SELECT} FROM "Order" {where} ORDER BY "createdAt" DESC'),
        params,
    ).mappings().all()
    return [_row_to_order(db, r) for r in rows]


# ── GET /orders/{order_id} ────────────────────────────────────────────────────

@router.get("/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    row = db.execute(
        text(f'{_ORDER_SELECT} FROM "Order" WHERE id=:id'),
        {"id": order_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    o = _row_to_order(db, row)
    if user.get("role") != "ADMIN" and user.get("sub") and o.get("userId") != user.get("sub"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return o


# ── GET /orders/status/{order_id} ─────────────────────────────────────────────

@router.get("/orders/status/{order_id}")
def get_order_status(order_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text('SELECT "id","status","total","createdAt" FROM "Order" WHERE "id"=:id'),
        {"id": order_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    out = dict(row)
    try:
        out["total"] = float(out.get("total") or 0)
    except Exception:
        pass
    return out


# ── POST /orders ──────────────────────────────────────────────────────────────

@router.post("/orders")
def create_order(payload: dict[str, Any], request: Request, db: Session = Depends(get_db)):
    from ..dependencies import get_optional_user
    user = get_optional_user(request) or {}
    items = payload.get("items") or []
    payment_method = payload.get("paymentMethod") or "CASH"
    source = payload.get("source") or "WEB"
    customer = payload.get("customer") or {}
    delivery = payload.get("delivery") or {}

    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="items required")

    total = 0.0
    norm_items: list[dict] = []

    for it in items:
        try:
            q = int(it.get("quantity") or 0)
            pid = str(it.get("productId") or "").strip()
            vid = str(it.get("variantId") or "").strip() or None
            if not pid or q <= 0:
                raise ValueError("bad item")

            base_price: float | None = None
            sale_price: float | None = None

            if vid:
                vrow = db.execute(
                    text('SELECT price,"salePrice" FROM "ProductVariant" WHERE id=:id AND "productId"=:pid'),
                    {"id": vid, "pid": pid},
                ).mappings().first()
                if vrow:
                    base_price = float(vrow.get("price") or 0)
                    sale_price = float(vrow["salePrice"]) if vrow.get("salePrice") is not None else None

            if base_price is None:
                prow = db.execute(
                    text('SELECT price,"salePrice" FROM "Product" WHERE id=:id'), {"id": pid}
                ).mappings().first()
                if not prow:
                    raise ValueError("product not found")
                base_price = float(prow.get("price") or 0)
                sale_price = float(prow["salePrice"]) if prow.get("salePrice") is not None else None

            eff = base_price
            if sale_price is not None and sale_price > 0 and base_price > 0 and sale_price < base_price:
                eff = sale_price
            if eff < 0:
                raise ValueError("negative price")

            total += q * eff
            norm_items.append({"productId": pid, "variantId": vid, "quantity": q, "price": eff})
        except Exception:
            raise HTTPException(status_code=400, detail="invalid item")

    order_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db.execute(
        text(
            'INSERT INTO "Order" ('
            'id,"userId",status,"paymentMethod",source,total,"createdAt","updatedAt",'
            '"customerFirstName","customerLastName","customerPhone","customerEmail",'
            '"deliveryMethod","deliveryCity","deliveryBranch","deliveryAddress","pickupLocationId"'
            ') VALUES ('
            ':id,:uid,:st,:pm,:src,:tot,:c,:u,'
            ':fn,:ln,:ph,:em,'
            ':dm,:dc,:db,:da,:pl'
            ')'
        ),
        dict(
            id=order_id, uid=user.get("sub"), st="PENDING",
            pm=str(payment_method).upper(), src=str(source).upper(), tot=total, c=now, u=now,
            fn=str(customer.get("firstName") or "").strip() or None,
            ln=str(customer.get("lastName") or "").strip() or None,
            ph=str(customer.get("phone") or "").strip() or None,
            em=str(customer.get("email") or "").strip() or None,
            dm=str(delivery.get("method") or "").strip() or None,
            dc=str(delivery.get("city") or "").strip() or None,
            db_=str(delivery.get("branch") or "").strip() or None,
            da=str(delivery.get("address") or "").strip() or None,
            pl=str(delivery.get("pickupLocationId") or "").strip() or None,
        ),
    )
    for it in norm_items:
        db.execute(
            text('INSERT INTO "OrderItem" (id,"orderId","productId","variantId",quantity,price) VALUES (:id,:oid,:pid,:vid,:q,:p)'),
            dict(id=str(uuid.uuid4()), oid=order_id, pid=it["productId"], vid=it["variantId"], q=it["quantity"], p=it["price"]),
        )
    db.commit()

    row = db.execute(
        text('SELECT id,"userId",status,"paymentMethod",source,total,"createdAt" FROM "Order" WHERE id=:id'),
        {"id": order_id},
    ).mappings().first()
    out = dict(row)
    try:
        out["total"] = float(out.get("total") or 0)
    except Exception:
        pass
    out["items"] = _order_items(db, order_id)
    return out


# ── PUT /orders/{order_id} ────────────────────────────────────────────────────

@router.put("/orders/{order_id}")
def update_order_status(
    order_id: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    status = str(payload.get("status") or "").upper()
    allowed = {"PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    row = db.execute(text('SELECT id FROM "Order" WHERE id=:id'), {"id": order_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.execute(
        text('UPDATE "Order" SET "status"=:s, "updatedAt"=:ts WHERE "id"=:id'),
        {"s": status, "ts": datetime.utcnow().isoformat(), "id": order_id}
    )
    db.commit()
    return get_order(order_id, db, user=user)
