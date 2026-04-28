import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..dependencies import require_admin

router = APIRouter(prefix="", tags=["utility"])

UPLOADS_DIR = "/tmp/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

from ..core.cache import cache_get, cache_set, cache_del


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/metrics")
def metrics():
    from ..database import engine
    from sqlalchemy import text
    return {}


@router.get("/sitemap-data")
def get_sitemap_data(db: Session = Depends(get_db)):
    key = "sitemap:data"
    cached = cache_get(key, ttl_s=3600)
    if cached is not None:
        return cached

    products = db.execute(
        text('SELECT slug, "updatedAt" FROM "Product" WHERE "isArchived" = false OR "isArchived" IS NULL')
    ).mappings().all()
    categories = db.execute(
        text('SELECT slug, "updatedAt" FROM "Category"')
    ).mappings().all()

    result = {
        "products": [{"slug": p["slug"], "updatedAt": p.get("updatedAt")} for p in products],
        "categories": [{"slug": c["slug"], "updatedAt": c.get("updatedAt")} for c in categories],
    }
    cache_set(key, result)
    return result


@router.post("/upload")
@router.post("/api/v1/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    content_type = str(file.content_type or "").lower().strip()
    original_name = str(file.filename or "").strip()
    ext = os.path.splitext(original_name)[1].lower()

    blocked_exts = {".html", ".htm", ".js", ".mjs", ".exe", ".bat", ".cmd", ".ps1", ".sh", ".php", ".py", ".jar", ".dll"}
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

    if ext in blocked_exts:
        raise HTTPException(400, "File type not allowed")
    if ext not in allowed_exts:
        raise HTTPException(400, "Unknown file type")

    file_id = uuid.uuid4().hex
    save_path = os.path.join(UPLOADS_DIR, f"{file_id}{ext}")

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    cloudinary_url = None
    cloudinary_public_id = None

    # Try cloudinary but continue on error
    try:
        from ..services.cloudinary_service import upload_to_cloudinary
        cloudinary_url, cloudinary_public_id = upload_to_cloudinary(save_path, public_id=f"vinesent/{file_id}")
    except Exception:
        pass

    if cloudinary_url:
        return {"url": cloudinary_url, "path": cloudinary_url}
    else:
        return {"url": f"/uploads/{file_id}{ext}", "path": f"/uploads/{file_id}{ext}"}


@router.get("/uploads/{file_id}")
def get_upload(file_id: str):
    for ext in ["", ".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        path = os.path.join(UPLOADS_DIR, f"{file_id}{ext}")
        if os.path.exists(path):
            return Response(content=open(path, "rb").read(), media_type="image/jpeg")
    raise HTTPException(404, "File not found")