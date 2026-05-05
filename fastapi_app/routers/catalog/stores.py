"""Stores router - CRUD operations for physical stores"""
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi_app.database import get_db

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("")
@router.get("/")
def list_stores(db: Session = Depends(get_db)):
    rows = db.execute(
        text('SELECT id, name, city, address, "mapsUrl", "createdAt", "updatedAt" FROM "Store" ORDER BY "createdAt" DESC')
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("")
@router.post("/")
def create_store(payload: dict[str, Any], db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    sid = str(uuid.uuid4())
    
    db.execute(
        text('INSERT INTO "Store" (id, name, city, address, "mapsUrl", "createdAt", "updatedAt") VALUES (:id, :name, :city, :addr, :maps, :c, :u)'),
        dict(
            id=sid,
            name=str(payload.get("name") or "").strip() or "Store",
            city=str(payload.get("city") or "").strip() or None,
            addr=str(payload.get("address") or "").strip() or None,
            maps=str(payload.get("mapsUrl") or "").strip() or None,
            c=now,
            u=now,
        ),
    )
    db.commit()
    
    row = db.execute(
        text('SELECT id,name,city,address,"mapsUrl","createdAt","updatedAt" FROM "Store" WHERE id=:id'),
        {"id": sid}
    ).mappings().first()
    
    return dict(row) if row else {"id": sid}


@router.put("/{store_id}")
def update_store(store_id: str, payload: dict[str, Any], db: Session = Depends(get_db)):
    row = db.execute(text('SELECT id FROM "Store" WHERE id=:id'), {"id": store_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")
    
    now = datetime.utcnow().isoformat()
    db.execute(
        text('UPDATE "Store" SET name=:name,city=:city,address=:addr,"mapsUrl"=:maps,"updatedAt"=:u WHERE id=:id'),
        dict(
            id=store_id,
            name=str(payload.get("name") or "").strip() or "Store",
            city=str(payload.get("city") or "").strip() or None,
            addr=str(payload.get("address") or "").strip() or None,
            maps=str(payload.get("mapsUrl") or "").strip() or None,
            u=now,
        ),
    )
    db.commit()
    
    out = db.execute(
        text('SELECT id,name,city,address,"mapsUrl","createdAt","updatedAt" FROM "Store" WHERE id=:id'),
        {"id": store_id}
    ).mappings().first()
    
    return dict(out) if out else {}


@router.delete("/{store_id}")
def delete_store(store_id: str, db: Session = Depends(get_db)):
    row = db.execute(text('SELECT id FROM "Store" WHERE id=:id'), {"id": store_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")
    
    db.execute(text('DELETE FROM "Store" WHERE id=:id'), {"id": store_id})
    db.commit()
    
    return {"ok": True}
