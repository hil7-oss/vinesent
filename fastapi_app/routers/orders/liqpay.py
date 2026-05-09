"""LiqPay payment integration router"""
import json
import base64
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi_app.config import (
    APP_ENV,
    LIQPAY_CURRENCY,
    LIQPAY_PRIVATE_KEY,
    LIQPAY_PUBLIC_KEY,
    get_liqpay_callback_url,
    get_liqpay_result_base,
)
from fastapi_app.database import get_db
from fastapi_app.liqpay import LiqPayHelper

router = APIRouter(prefix="/liqpay", tags=["liqpay"])


def _liqpay():
    public_key = LIQPAY_PUBLIC_KEY
    private_key = LIQPAY_PRIVATE_KEY
    if APP_ENV == "production" and (not public_key or not private_key):
        raise RuntimeError("LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY are required in production")
    return LiqPayHelper(public_key or "sandbox_pub", private_key or "sandbox_prv")


@router.get("/pay-order")
def liqpay_pay_order(orderId: str, db: Session = Depends(get_db)):
    row = db.execute(text('SELECT id,total FROM "Order" WHERE id=:id'), {"id": orderId}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="order_not_found")
    
    total = float(row.get("total") or 0)
    params = {
        "action": "pay",
        "version": "3",
        "amount": f"{total:.0f}" if float(total).is_integer() else f"{total:.2f}",
        "currency": LIQPAY_CURRENCY,
        "description": f"Order {orderId}",
        "order_id": orderId,
        "sandbox": 1 if APP_ENV != "production" else 0,
        "server_url": get_liqpay_callback_url(),
        "result_url": f"{get_liqpay_result_base().rstrip('/')}/checkout/{orderId}/result",
    }
    
    helper = _liqpay()
    return {
        "data": helper.cnb_data(params),
        "signature": helper.cnb_signature(params),
        "checkout_url": LiqPayHelper.CHECKOUT_URL,
        "order_id": orderId,
    }


@router.post("/callback")
def liqpay_callback(data: str = Form(), signature: str = Form(), db: Session = Depends(get_db)):
    helper = _liqpay()
    expected = helper._signature(data)
    
    if expected != signature:
        raise HTTPException(status_code=400, detail="invalid_signature")
    
    try:
        payload = json.loads(base64.b64decode(data).decode())
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_payload")
    
    order_id = str(payload.get("order_id") or "")
    status = str(payload.get("status") or "").lower()
    
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id_missing")
    
    row = db.execute(text('SELECT id,total FROM "Order" WHERE id=:id'), {"id": order_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="order_not_found")
    
    total = float(row.get("total") or 0)
    amount = None
    try:
        amount = float(payload.get("amount") or 0)
    except Exception:
        amount = None
    
    err_code = payload.get("err_code") or payload.get("errCode")
    now = datetime.utcnow().isoformat()
    
    db.execute(
        text('UPDATE "Order" SET "liqpayStatus"=:ls, "updatedAt"=:u WHERE id=:id'),
        {"ls": status, "u": now, "id": order_id}
    )
    
    if status in ("success", "sandbox") and not err_code and amount is not None and abs(amount - total) < 0.01:
        db.execute(
            text('UPDATE "Order" SET status=:s, "paymentMethod"=:pm, "updatedAt"=:u WHERE id=:id'),
            {"s": "PAID", "pm": "CARD", "u": now, "id": order_id}
        )
        db.commit()
    elif status in ("failure", "error", "reversed", "expired"):
        db.execute(
            text('UPDATE "Order" SET status=:s, "updatedAt"=:u WHERE id=:id'),
            {"s": "CANCELLED", "u": now, "id": order_id}
        )
        db.commit()
    
    return {"ok": True, "order_id": order_id, "status": status}


@router.get("/status")
def liqpay_status(orderId: str, db: Session = Depends(get_db)):
    helper = _liqpay()
    params = {
        "action": "status",
        "version": "3",
        "order_id": orderId,
    }
    
    data_str = helper.cnb_data(params)
    sig = helper.cnb_signature(params)
    
    try:
        import requests
        r = requests.post(
            "https://www.liqpay.ua/api/request",
            data={"data": data_str, "signature": sig},
            timeout=10
        )
        info = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="liqpay_status_failed")
    
    st = str(info.get("status") or "").lower()
    row = db.execute(text('SELECT id,total FROM "Order" WHERE id=:id'), {"id": orderId}).mappings().first()
    now = datetime.utcnow().isoformat()
    
    db.execute(
        text('UPDATE "Order" SET "liqpayStatus"=:ls, "updatedAt"=:u WHERE id=:id'),
        {"ls": st, "u": now, "id": orderId}
    )
    
    if row:
        total = float(row.get("total") or 0)
        amount = None
        try:
            amount = float(info.get("amount") or 0)
        except Exception:
            amount = None
        
        err_code = info.get("err_code") or info.get("errCode")
        
        if st in ("success", "sandbox") and not err_code and amount is not None and abs(amount - total) < 0.01:
            db.execute(
                text('UPDATE "Order" SET status=:s, "paymentMethod"=:pm, "updatedAt"=:u WHERE id=:id'),
                {"s": "PAID", "pm": "CARD", "u": now, "id": orderId}
            )
            db.commit()
        elif st in ("failure", "error", "reversed", "expired"):
            db.execute(
                text('UPDATE "Order" SET status=:s, "updatedAt"=:u WHERE id=:id'),
                {"s": "CANCELLED", "u": now, "id": orderId}
            )
            db.commit()
    
    return {"order_id": orderId, "status": st, "raw": info}
