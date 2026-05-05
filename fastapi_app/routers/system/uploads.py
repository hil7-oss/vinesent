"""File upload router with Cloudinary support"""
import os
import uuid
import time
import re
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PIL import Image

from fastapi_app.config import UPLOADS_DIR
from fastapi_app.dependencies import require_admin

router = APIRouter(tags=["uploads"])

os.makedirs(UPLOADS_DIR, exist_ok=True)

_IMAGE_SIGS = (b'\x89PNG', b'\xff\xd8', b'GIF8', b'RIFF', b'BM', b'\x00\x00\x01\x00')


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    """Upload image file with Cloudinary support and local fallback"""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    max_bytes = int(os.getenv("MAX_UPLOAD_BYTES", "10485760"))
    content_type = str(file.content_type or "").lower().strip()
    original_name = str(file.filename or "").strip()
    ext = os.path.splitext(original_name)[1].lower()
    
    # Security checks
    blocked_exts = {".html", ".htm", ".js", ".mjs", ".exe", ".bat", ".cmd", ".ps1", ".sh", ".php", ".py", ".jar", ".dll"}
    if ext in blocked_exts:
        raise HTTPException(status_code=400, detail="blocked_file_type")
    
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="unsupported_file_type")
    
    if content_type and content_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise HTTPException(status_code=400, detail="unsupported_content_type")
    
    # Verify image signature
    head = await file.read(16)
    try:
        await file.seek(0)
    except Exception:
        pass
    
    if not head or not any(head.startswith(sig) for sig in _IMAGE_SIGS):
        raise HTTPException(status_code=400, detail="invalid_image_signature")
    
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "", os.path.basename(original_name)) or "upload"
    filename = f"{int(time.time())}_{uuid.uuid4().hex[:6]}_{clean_name}"
    
    # Check if Cloudinary is configured
    use_cloudinary = all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET")
    ])
    
    if use_cloudinary:
        try:
            from ...services.cloudinary_service import upload_image
            
            # Read file into memory
            image_bytes = await file.read()
            
            # Upload to Cloudinary with automatic optimization
            public_id = f"products/{int(time.time())}_{uuid.uuid4().hex[:8]}"
            result = upload_image(image_bytes, folder="vinesent", public_id=public_id)
            
            logging.info(f"Uploaded to Cloudinary: {result['url']}")
            return {"url": result["url"], "cloudinary": True}
            
        except Exception as e:
            logging.exception("cloudinary_upload_failed")
            # Fallback to local storage
            try:
                await file.seek(0)
            except Exception:
                pass
    
    # Local storage fallback
    filepath = os.path.join(UPLOADS_DIR, filename)
    
    written = 0
    with open(filepath, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                try:
                    os.remove(filepath)
                except Exception:
                    pass
                raise HTTPException(status_code=400, detail="file_too_large")
            buffer.write(chunk)
    
    # Generate LQIP (Low Quality Image Placeholder)
    try:
        lqip_dir = os.path.join(UPLOADS_DIR, "_lqip")
        os.makedirs(lqip_dir, exist_ok=True)
        lqip_path = os.path.join(lqip_dir, filename)
        
        with Image.open(filepath) as img:
            img = img.convert("RGB")
            w, h = img.size
            tw = 480
            th = int(h * (tw / max(1, w)))
            img = img.resize((tw, th))
            img.save(lqip_path, format="JPEG", quality=30, optimize=True)
            
    except Exception:
        logging.exception("upload_lqip_failed")
    
    logging.info(f"Uploaded locally: /uploads/{filename}")
    return {"url": f"/uploads/{filename}", "cloudinary": False}
