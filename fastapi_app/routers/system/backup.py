import os
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi_app.database import get_db
from fastapi_app.dependencies import require_admin

router = APIRouter(prefix="/admin/backup", dependencies=[Depends(require_admin)])

@router.post("/mongo")
def backup_to_mongo(db: Session = Depends(get_db)):
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise HTTPException(status_code=400, detail="MONGODB_URI is not set")
    try:
        from pymongo import MongoClient, UpdateOne
    except ImportError:
        raise HTTPException(status_code=500, detail="pymongo_not_installed")

    client = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception:
        raise HTTPException(status_code=502, detail="mongodb_unavailable")
    dbname = os.getenv("MONGODB_DB", "vinesent_backup")
    mdb = client[dbname]
    categories = db.execute(text("SELECT id,name,slug,description,image,parentId,createdAt,updatedAt FROM Category")).mappings().all()
    products = db.execute(text("SELECT id,name,slug,description,price,salePrice,cost,images,stock,seoTitle,seoDescription,categoryId,createdAt,updatedAt FROM Product")).mappings().all()
    variants = db.execute(text("SELECT id,productId,size,color,sku,barcode,price,salePrice,cost,stock,images,createdAt,updatedAt FROM ProductVariant")).mappings().all()
    links = db.execute(text("SELECT A as categoryId, B as productId FROM _ProductCategories")).mappings().all()
    cat_lookup = {c["id"]: dict(c) for c in categories}
    prod_cats = {}
    for l in links:
        pid = l["productId"]
        cid = l["categoryId"]
        prod_cats.setdefault(pid, []).append(cid)
    cat_ops = []
    for c in categories:
        d = dict(c)
        d["_id"] = d.pop("id")
        cat_ops.append(UpdateOne({"_id": d["_id"]}, {"$set": d}, upsert=True))
    prod_ops = []
    for p in products:
        d = dict(p)
        d["_id"] = d.pop("id")
        imgs = []
        try:
            imgs = json.loads(d.get("images") or "[]")
        except Exception:
            imgs = []
        d["images"] = imgs
        d["categoryIds"] = prod_cats.get(d["_id"], [])
        prod_ops.append(UpdateOne({"_id": d["_id"]}, {"$set": d}, upsert=True))
    var_ops = []
    for v in variants:
        d = dict(v)
        d["_id"] = d.pop("id")
        imgs = []
        try:
            imgs = json.loads(d.get("images") or "[]")
        except Exception:
            imgs = []
        d["images"] = imgs
        var_ops.append(UpdateOne({"_id": d["_id"]}, {"$set": d}, upsert=True))
    if cat_ops:
        mdb["categories"].bulk_write(cat_ops, ordered=False)
    if prod_ops:
        mdb["products"].bulk_write(prod_ops, ordered=False)
    if var_ops:
        mdb["variants"].bulk_write(var_ops, ordered=False)
    link_ops = []
    for l in links:
        d = {"_id": f'{l["categoryId"]}:{l["productId"]}', "categoryId": l["categoryId"], "productId": l["productId"]}
        link_ops.append(UpdateOne({"_id": d["_id"]}, {"$set": d}, upsert=True))
    if link_ops:
        mdb["product_categories"].bulk_write(link_ops, ordered=False)
    return {"ok": True, "categories": len(categories), "products": len(products), "variants": len(variants)}
