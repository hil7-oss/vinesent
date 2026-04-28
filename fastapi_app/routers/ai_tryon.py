"""
routers/ai_tryon.py — Публичный /ai/tryon эндпоинт.

Делегирует логику в ai_photos.try_on_photo.
Зарегистрировать в main.py: app.include_router(ai_tryon.router)
"""
import os
import tempfile
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool

from ..dependencies import get_current_user
from ..services import gemini_service, cloudinary_service

router = APIRouter(tags=["ai"])
logger = logging.getLogger(__name__)

_IMAGE_SIGS = (b'\x89PNG', b'\xff\xd8', b'GIF8', b'RIFF', b'BM', b'\x00\x00\x01\x00')
MAX_TRYON_BYTES = int(os.getenv("MAX_TRYON_BYTES", str(10 * 1024 * 1024)))  # 10MB


def _hex_to_rgb_str(h: str) -> str:
    h = h.strip().lstrip("#")
    if len(h) != 6:
        return "R0 G0 B0"
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"R{r} G{g} B{b}"


def _default_prompt(rgb_str: str) -> str:
    """Возвращает базовый промпт для трайона если пользовательский не предоставлен."""
    return (
        f"Fashion photo of a person wearing the clothing item shown in the reference image. "
        f"The garment color is {rgb_str}. "
        "Professional studio lighting, white background, full body shot, high quality."
    )


def _safe_remove(path: Optional[str]):
    if path:
        try:
            os.remove(path)
        except OSError:
            pass


@router.post("/ai/tryon")
async def ai_tryon(
    file: UploadFile = File(...),
    rgb: str = Form(default="#000000"),
    productId: str = Form(default=""),
    prompt: Optional[str] = Form(default=None),
    gender: Optional[str] = Form(default="unisex"),
):
    """
    AI Try-On: принимает изображение одежды, генерирует фото с виртуальной примеркой.

    - file: изображение (JPEG/PNG/WebP)
    - rgb: HEX цвет (#RRGGBB)
    - productId: опционально, для сохранения результата
    - prompt: опциональный кастомный промпт
    - gender: male | female | unisex
    """
    # Читаем первые байты для проверки сигнатуры
    head = await file.read(16)
    if not head or not any(head.startswith(sig) for sig in _IMAGE_SIGS):
        raise HTTPException(status_code=400, detail="invalid_image_format")
    try:
        await file.seek(0)
    except Exception:
        raise HTTPException(status_code=400, detail="upload_seek_failed")

    # Читаем полный файл с проверкой размера
    content = b""
    while True:
        chunk = await file.read(1024 * 256)
        if not chunk:
            break
        content += chunk
        if len(content) > MAX_TRYON_BYTES:
            raise HTTPException(status_code=400, detail="file_too_large")

    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    temp_path: Optional[str] = None
    try:
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "wb") as f:
            f.write(content)

        rgb_str = _hex_to_rgb_str(str(rgb).strip())
        eff_prompt = str(prompt or "").strip() or _default_prompt(rgb_str)

        img_bytes = await run_in_threadpool(
            gemini_service.generate_fashion_photo, temp_path, eff_prompt
        )

        # Загружаем в Cloudinary или сохраняем локально
        use_cloudinary = all([
            os.getenv("CLOUDINARY_CLOUD_NAME"),
            os.getenv("CLOUDINARY_API_KEY"),
            os.getenv("CLOUDINARY_API_SECRET"),
        ])
        if use_cloudinary:
            try:
                result = await run_in_threadpool(
                    cloudinary_service.upload_image,
                    img_bytes, "vinesent-tryon", f"tryon_{productId or 'anon'}"
                )
                url = result.get("url")
                return {"url": url, "status": "done", "productId": productId or None}
            except Exception as e:
                logger.warning("cloudinary_tryon_upload_failed: %s", e)

        # Fallback — локальный файл
        import time, secrets, uuid as _uuid
        from ..config import UPLOADS_DIR
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        fname = f"tryon_{int(time.time())}_{secrets.token_hex(4)}.png"
        fpath = os.path.join(UPLOADS_DIR, fname)
        with open(fpath, "wb") as f:
            f.write(img_bytes)
        url = f"/uploads/{fname}"
        return {"url": url, "status": "done", "productId": productId or None}

    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if any(k in err for k in ("RESOURCE_EXHAUSTED", "429", "quota")):
            raise HTTPException(status_code=429, detail="ai_rate_limited")
        logger.exception("ai_tryon_error")
        raise HTTPException(status_code=500, detail="ai_generation_failed")
    finally:
        _safe_remove(temp_path)
