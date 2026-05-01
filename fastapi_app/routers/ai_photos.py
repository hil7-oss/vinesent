import json
import os
import time
import tempfile
import uuid
import base64
import requests
import logging
import secrets
import threading
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from .run_generate_photos import build_prompts, build_prompts_for_product, _detect_block_type
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..services.gemini_service import get_exact_rgb, rgb_to_hex
from ..services.prompt_service import render_prompt
from ..services import gemini_service, cloudinary_service
from ..database import db_session
from ..dependencies import require_admin

router = APIRouter(prefix="/admin/ai-photos", dependencies=[Depends(require_admin)])
logger = logging.getLogger(__name__)

_FASTAPI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOADS_DIR = os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), "uploads")

_IMAGE_SIGS = (b'\x89PNG', b'\xff\xd8', b'GIF8', b'RIFF', b'BM', b'\x00\x00\x01\x00')

def _ensure_binary_image(data: bytes) -> bytes:
    if data and not any(data[:4].startswith(sig) for sig in _IMAGE_SIGS):
        try:
            decoded = base64.b64decode(data)
            if any(decoded[:4].startswith(sig) for sig in _IMAGE_SIGS):
                return decoded
        except Exception:
            pass
    return data

# Задержка между запросами в батче
BATCH_ITEM_DELAY_S = float(os.getenv("AI_BATCH_DELAY_S", "3"))
# Retry при 429
MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "4"))
RETRY_BASE_S = float(os.getenv("AI_RETRY_BASE_S", "10"))
_SLEEP_EVENT = threading.Event()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    product_id: str = Field(alias="productId")
    prompt_template_id: Optional[int] = Field(alias="promptTemplateId", default=None)
    gender: str
    color_source: str = Field(alias="colorSource", default="auto")
    color_hex: Optional[str] = Field(alias="colorHex", default=None)
    color_name: Optional[str] = Field(alias="colorName", default=None)
    image_type: str = Field(alias="imageType", default="front")  # front, back, side

    class Config:
        populate_by_name = True


class BatchGenerateRequest(BaseModel):
    product_ids: List[str] = Field(alias="productIds")
    prompt_template_id: Optional[int] = Field(alias="promptTemplateId", default=None)
    gender: str
    color_source: str = Field(alias="colorSource", default="auto")
    color_hex: Optional[str] = Field(alias="colorHex", default=None)
    color_name: Optional[str] = Field(alias="colorName", default=None)

    class Config:
        populate_by_name = True


class CreateTemplateRequest(BaseModel):
    name: str
    category: str
    gender: str
    template_text: str = Field(alias="templateText")

    class Config:
        populate_by_name = True


class UpsertTemplateRequest(BaseModel):
    category: str
    gender: str
    template_text: str = Field(alias="templateText")
    name: Optional[str] = None

    class Config:
        populate_by_name = True


def _ensure_tables():
    # Tables are managed by Prisma migrations - this function is deprecated
    pass

# Deprecated: no longer auto-creating tables
# _ensure_tables()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _default_prompt_index() -> int:
    try:
        i = int(os.getenv("AI_PROMPT_INDEX", "0"))
        if i < 0:
            return 0
        return i
    except Exception:
        return 0

def hex_to_rgb_str(h: str) -> str:
    h = h.strip().lstrip("#")
    if len(h) != 6:
        return "R0 G0 B0"
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"R{r} G{g} B{b}"


def safe_remove(path: Optional[str]):
    if path:
        try:
            os.remove(path)
        except OSError:
            pass


def is_rate_limit(e: Exception) -> bool:
    return any(k in str(e) for k in ("RESOURCE_EXHAUSTED", "429", "quota"))


def load_image_to_temp(image_url: str) -> str:
    if image_url.startswith("http"):
        max_bytes = int(os.getenv("MAX_DOWNLOAD_BYTES", "10485760"))
        resp = requests.get(image_url, stream=True, timeout=15)
        resp.raise_for_status()
        suffix = os.path.splitext(image_url)[1] or ".jpg"
        fd, path = tempfile.mkstemp(suffix=suffix)
        total = 0
        with os.fdopen(fd, "wb") as f:
            for chunk in resp.iter_content(8192):
                if chunk:
                    total += len(chunk)
                    if total > max_bytes:
                        safe_remove(path)
                        raise HTTPException(400, "remote_file_too_large")
                    f.write(chunk)
        return path

    candidates = [
        os.path.join(UPLOADS_DIR, image_url.lstrip("/").replace("uploads/", "", 1)),
        os.path.abspath(os.path.join(_FASTAPI_DIR, "vinesent-api", "public", image_url.lstrip("/"))),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../vinesent-api/public", image_url.lstrip("/"))),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise HTTPException(404, f"Local image not found: {image_url}")


def upload_result_image(image_bytes: bytes) -> dict:
    image_bytes = _ensure_binary_image(image_bytes)
    try:
        return cloudinary_service.upload_image(
            image_bytes, folder="vinesent-ai", public_id=str(uuid.uuid4())
        )
    except Exception:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        filename = f"ai_{int(time.time())}_{secrets.token_hex(4)}.png"
        file_path = os.path.join(UPLOADS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        return {"url": f"/uploads/{filename}", "public_id": f"local/{filename}"}


# ---------------------------------------------------------------------------
# Core: generate with exponential backoff on 429
# ---------------------------------------------------------------------------

def generate_image(image_path: str, prompt: str) -> bytes:
    delay = RETRY_BASE_S
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return gemini_service.generate_fashion_photo(image_path, prompt)
        except Exception as e:
            if is_rate_limit(e):
                if attempt == MAX_RETRIES:
                    raise HTTPException(429, "ai_rate_limited")
                logger.info("Rate limit (attempt %d/%d), retrying in %.0fs", attempt, MAX_RETRIES, delay)
                _SLEEP_EVENT.wait(delay)
                delay = min(delay * 2, 60)
            else:
                raise


# ---------------------------------------------------------------------------
# DB write helpers
# ---------------------------------------------------------------------------

def save_generated_photo(
    db: Session,
    product_id: str,
    cloudinary_url: str,
    cloudinary_public_id: str,
    gender: str,
    color_hex: str,
    color_name: str,
    prompt_template_id: Optional[int] = None,
) -> int:
    dialect = db.get_bind().dialect.name
    params = dict(
        product_id=product_id,
        prompt_template_id=prompt_template_id,
        cloudinary_url=cloudinary_url,
        cloudinary_public_id=cloudinary_public_id,
        gender=gender,
        color_hex=color_hex,
        color_name=color_name,
    )
    if dialect == "postgresql":
        rid = db.execute(
            text(
                """
                INSERT INTO generated_photos
                    (product_id, prompt_template_id, cloudinary_url, cloudinary_public_id,
                     gender, color_hex, color_name, status)
                VALUES (:product_id, :prompt_template_id, :cloudinary_url, :cloudinary_public_id,
                        :gender, :color_hex, :color_name, 'done')
                RETURNING id
                """
            ),
            params,
        ).scalar_one()
        return int(rid)
    res = db.execute(
        text(
            """
            INSERT INTO generated_photos
                (product_id, prompt_template_id, cloudinary_url, cloudinary_public_id,
                 gender, color_hex, color_name, status)
            VALUES (:product_id, :prompt_template_id, :cloudinary_url, :cloudinary_public_id,
                    :gender, :color_hex, :color_name, 'done')
            """
        ),
        params,
    )
    lastrowid = getattr(res, "lastrowid", None)
    if lastrowid is None:
        lastrowid = db.execute(text("SELECT last_insert_rowid()")).scalar_one()
    return int(lastrowid)


def append_product_image(db: Session, product_id: str, url: str, image_type: str = "additional", is_generated: bool = True, cloudinary_public_id: Optional[str] = None):
    """Add generated image to product with proper type"""
    from ..utils.images import add_product_image
    
    row = db.execute(text('SELECT images FROM "Product" WHERE id = :id'), {"id": product_id}).mappings().first()
    if row:
        current_images = row.get("images")
        updated_images = add_product_image(
            current_images,
            url,
            type=image_type,  # type: ignore
            is_generated=is_generated,
            cloudinary_public_id=cloudinary_public_id
        )
        db.execute(
            text('UPDATE "Product" SET images = :imgs WHERE id = :id'),
            {"imgs": updated_images, "id": product_id}
        )


def upsert_prompt_template(
    db: Session,
    category: str,
    gender: str,
    template_text: str,
    name: Optional[str] = None,
):
    dialect = db.get_bind().dialect.name
    db.execute(
        text("UPDATE prompt_templates SET is_active = 0 WHERE category = :c AND gender = :g AND is_active = 1"),
        {"c": category, "g": gender},
    )
    params = {"name": name or f"{category}:{gender}", "category": category, "gender": gender, "template_text": template_text}
    if dialect == "postgresql":
        rid = db.execute(
            text("INSERT INTO prompt_templates (name, category, gender, template_text, is_active) VALUES (:name, :category, :gender, :template_text, 1) RETURNING id"),
            params,
        ).scalar_one()
        return int(rid)
    res = db.execute(
        text("INSERT INTO prompt_templates (name, category, gender, template_text, is_active) VALUES (:name, :category, :gender, :template_text, 1)"),
        params,
    )
    lastrowid = getattr(res, "lastrowid", None)
    if lastrowid is None:
        lastrowid = db.execute(text("SELECT last_insert_rowid()")).scalar_one()
    return int(lastrowid)


def _update_job(db: Session, job_id: str, done: int, failed: int, status: str = "running"):
    db.execute(
        text("UPDATE batch_jobs SET done=:d, failed=:f, status=:s WHERE id=:id"),
        {"d": done, "f": failed, "s": status, "id": job_id},
    )
    db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/products", response_model=List[Dict[str, Any]])
def get_products(
    category: Optional[str] = None,
    has_ai_photo: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
):
    query = """
        SELECT p.id, p.name, p.images, p."categoryId",
               gp.id as ai_photo_id, gp.cloudinary_url as ai_photo_url, gp.status as ai_status
        FROM "Product" p
        LEFT JOIN generated_photos gp ON p.id = gp.product_id
    """
    params: dict = {}
    conds: list[str] = []
    if category:
        conds.append('p."categoryId" = :category')
        params["category"] = category
    if has_ai_photo is True:
        conds.append("gp.id IS NOT NULL")
    elif has_ai_photo is False:
        conds.append("gp.id IS NULL")
    if conds:
        query += " WHERE " + " AND ".join(conds)
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = (page - 1) * limit

    with db_session() as db:
        rows = db.execute(text(query), params).mappings().all()

    result = []
    for row in rows:
        try:
            images = json.loads(row["images"]) if row["images"] else []
        except Exception:
            images = []
        result.append({
            "id": row.get("id"),
            "name": row.get("name"),
            "image": images[0] if images else None,
            "categoryId": row.get("categoryId"),
            "aiPhoto": {
                "id": row.get("ai_photo_id"),
                "url": row.get("ai_photo_url"),
                "status": row.get("ai_status"),
            } if row.get("ai_photo_id") else None,
        })
    return result


@router.post("/generate")
def generate_photo(req: GenerateRequest):
    with db_session() as db:
        prod = db.execute(text('SELECT images FROM "Product" WHERE id = :id'), {"id": req.product_id}).mappings().first()
        if not prod:
            raise HTTPException(404, "Product not found")
        try:
            images = json.loads(prod.get("images"))
            image_url = images[0]
        except Exception:
            raise HTTPException(400, "Product has no valid images")

        template_text = None
        if req.prompt_template_id:
            tpl = db.execute(
                text("SELECT template_text FROM prompt_templates WHERE id = :id"),
                {"id": req.prompt_template_id},
            ).mappings().first()
            if tpl:
                template_text = tpl.get("template_text")

    temp_path = load_image_to_temp(image_url)
    try:
        if req.color_source == "auto":
            try:
                rgb = get_exact_rgb(temp_path)
                req.color_hex = rgb_to_hex(rgb)
                req.color_name = req.color_name or "extracted color"
            except Exception:
                pass

        rgb_str = hex_to_rgb_str(req.color_hex or "#000000")
        
        # Get product category for smart prompt generation
        prod_category = "clothing"
        with db_session() as db:
            prow = db.execute(
                text('SELECT "categoryId" FROM "Product" WHERE id = :id'),
                {"id": req.product_id},
            ).mappings().first()
            if prow and prow.get("categoryId"):
                crow = db.execute(
                    text('SELECT name, slug FROM "Category" WHERE id = :id'),
                    {"id": prow.get("categoryId")},
                ).mappings().first()
                if crow:
                    prod_category = str(crow.get("name") or crow.get("slug") or "clothing").strip()
        
        # Generate prompt based on image type and category
        if template_text:
            prompt = render_prompt(
                template_text,
                category=prod_category,
                gender=req.gender,
                color_name=req.color_name or "colorful",
                color_hex=req.color_hex or "#000000",
                rgb_str=rgb_str,
                image_type=req.image_type,
            )
        else:
            # Use new category-aware prompt builder
            prompts_data = build_prompts_for_product(
                category=prod_category,
                gender=req.gender,
                color_hex=req.color_hex or "#000000",
                color_name=req.color_name or "colorful",
                image_type=req.image_type,
                count=1,
            )
            prompt = prompts_data[0]["prompt"] if prompts_data else ""

        logger.info(
            "Generating %s image for product %s",
            req.image_type, req.product_id
        )

        img_bytes = generate_image(temp_path, prompt)
        up = upload_result_image(img_bytes)

        with db_session() as db:
            new_id = save_generated_photo(
                db, req.product_id, up["url"], up["public_id"],
                req.gender, req.color_hex or "", req.color_name or "",
                req.prompt_template_id,
            )
            append_product_image(
                db, req.product_id, up["url"],
                image_type=req.image_type,
                is_generated=True,
                cloudinary_public_id=up["public_id"]
            )
            db.commit()

        return {"id": new_id, "productId": req.product_id, "cloudinaryUrl": up["url"], "imageType": req.image_type, "status": "done"}
    finally:
        if image_url.startswith("http"):
            safe_remove(temp_path)


@router.post("/generate-batch")
def generate_batch(req: BatchGenerateRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    with db_session() as db:
        db.execute(
            text("INSERT INTO batch_jobs (id, total, done, failed, status) VALUES (:id, :t, 0, 0, 'running')"),
            {"id": job_id, "t": len(req.product_ids)},
        )
        db.commit()
    background_tasks.add_task(_process_batch, job_id, req)
    return {"jobId": job_id, "status": "running"}


def _process_batch(job_id: str, req: BatchGenerateRequest):
    done = 0
    failed = 0
    with db_session() as db:
        for i, pid in enumerate(req.product_ids):
            if i > 0:
                _SLEEP_EVENT.wait(BATCH_ITEM_DELAY_S)
            try:
                prod = db.execute(text('SELECT images FROM "Product" WHERE id = :id'), {"id": pid}).mappings().first()
                if not prod:
                    raise ValueError("not found")
                images = json.loads(prod.get("images")) if prod.get("images") else []
                if not images:
                    raise ValueError("no images")

                image_url = images[0]
                temp_path = load_image_to_temp(image_url)
                try:
                    rgb_str = hex_to_rgb_str(req.color_hex or "#000000")
                    prompts = build_prompts(rgb_str)
                    idx = _default_prompt_index()
                    prompt = prompts[idx] if 0 <= idx < len(prompts) else prompts[0]
                    img_bytes = generate_image(temp_path, prompt)
                    up = upload_result_image(img_bytes)
                    save_generated_photo(
                        db, pid, up["url"], up["public_id"],
                        req.gender, req.color_hex or "", req.color_name or ""
                    )
                    append_product_image(db, pid, up["url"])
                    done += 1
                finally:
                    if image_url.startswith("http"):
                        safe_remove(temp_path)
            except Exception as e:
                logger.error("batch pid=%s: %s", pid, e)
                failed += 1

            _update_job(db, job_id, done, failed)

        _update_job(db, job_id, done, failed, "completed")


@router.get("/batch-status/{job_id}")
def get_batch_status(job_id: str):
    with db_session() as db:
        row = db.execute(
            text("SELECT id,total,done,failed,status,created_at FROM batch_jobs WHERE id = :id"),
            {"id": job_id},
        ).mappings().first()
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(row)


@router.get("/prompt-templates")
def get_templates(category: Optional[str] = None, gender: Optional[str] = None):
    query = "SELECT * FROM prompt_templates"
    params: dict = {}
    conds: list[str] = []
    if category:
        conds.append("category = :category")
        params["category"] = category
    if gender:
        conds.append("gender = :gender")
        params["gender"] = gender
    if conds:
        query += " WHERE " + " AND ".join(conds)
    with db_session() as db:
        rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/prompt-templates")
def create_template(req: CreateTemplateRequest):
    with db_session() as db:
        dialect = db.get_bind().dialect.name
        params = {"name": req.name, "category": req.category, "gender": req.gender, "template_text": req.template_text}
        if dialect == "postgresql":
            new_id = db.execute(
                text("INSERT INTO prompt_templates (name, category, gender, template_text, is_active) VALUES (:name, :category, :gender, :template_text, 1) RETURNING id"),
                params,
            ).scalar_one()
        else:
            res = db.execute(
                text("INSERT INTO prompt_templates (name, category, gender, template_text, is_active) VALUES (:name, :category, :gender, :template_text, 1)"),
                params,
            )
            new_id = getattr(res, "lastrowid", None) or db.execute(text("SELECT last_insert_rowid()")).scalar_one()
        db.commit()
    return {"id": new_id, **req.dict()}


@router.post("/prompt-templates/upsert")
def upsert_template_endpoint(req: UpsertTemplateRequest):
    with db_session() as db:
        new_id = upsert_prompt_template(db, req.category, req.gender, req.template_text, req.name)
        db.commit()
    return {"id": new_id, "category": req.category, "gender": req.gender}


@router.post("/tryon")
async def try_on_photo(
    file: UploadFile = File(...),
    category: str = Form(...),
    rgb: str = Form(...),
    productId: str = Form(...),
    prompt: Optional[str] = Form(None),
    promptCategory: Optional[str] = Form(None),
    gender: Optional[str] = Form("male"),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(await file.read())

        rgb_str = hex_to_rgb_str(rgb)
        eff_category = (promptCategory or category).strip()
        if prompt:
            eff_prompt = prompt
        else:
            # Use new category-aware prompt builder
            prompts_data = build_prompts_for_product(
                category=eff_category,
                gender=gender or "unisex",
                color_hex=rgb,
                color_name=rgb_str,
                image_type="front",  # Single photo for tryon
                count=1,
            )
            eff_prompt = prompts_data[0]["prompt"] if prompts_data else build_prompts(rgb_str)[0]

        with db_session() as db:
            upsert_prompt_template(db, eff_category, gender or "unisex", eff_prompt)
            db.commit()

        img_bytes = await run_in_threadpool(generate_image, temp_path, eff_prompt)
        up = await run_in_threadpool(upload_result_image, img_bytes)

        with db_session() as db:
            save_generated_photo(db, productId, up["url"], up["public_id"], gender or "male", rgb, rgb_str)
            append_product_image(db, productId, up["url"])
            db.commit()

        return {"url": up["url"], "status": "done"}

    except HTTPException:
        raise
    except Exception as e:
        if is_rate_limit(e):
            raise HTTPException(429, "ai_rate_limited")
        raise HTTPException(500, str(e))
    finally:
        safe_remove(temp_path)


@router.post("/generate-multiple")
async def generate_multiple_photos(
    productId: str = Form(...),
    category: str = Form(...),
    gender: str = Form("male"),
    colorHex: str = Form("#000000"),
    file: Optional[UploadFile] = File(None),
    fileBack: Optional[UploadFile] = File(None),  # Друге фото для спини
    background_tasks: BackgroundTasks = None,
):
    owns_temp = False
    temp_path: Optional[str] = None

    try:
        if file:
            suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
            fd, temp_path = tempfile.mkstemp(suffix=suffix)
            with os.fdopen(fd, "wb") as f:
                f.write(await file.read())
            base_path = temp_path
            owns_temp = True
        else:
            with db_session() as db:
                prod = db.execute(text('SELECT images FROM "Product" WHERE id = :id'), {"id": productId}).mappings().first()
            if not prod:
                raise HTTPException(404, "Product not found")
            try:
                images = json.loads(prod.get("images")) if prod.get("images") else []
            except Exception:
                images = []
            if not images:
                raise HTTPException(400, "Product has no images")
            image_url = images[0]
            base_path = load_image_to_temp(image_url)
            owns_temp = image_url.startswith("http")

        rgb_str = hex_to_rgb_str(colorHex)
        
        # Get category name from product for smart prompt generation
        prod_category = None
        prod_name = None
        with db_session() as db:
            prow = db.execute(
                text('SELECT "categoryId" FROM "Product" WHERE id = :id'),
                {"id": productId},
            ).mappings().first()
            if prow and prow.get("categoryId"):
                crow = db.execute(
                    text('SELECT name, slug FROM "Category" WHERE id = :id'),
                    {"id": prow.get("categoryId")},
                ).mappings().first()
                if crow:
                    prod_category = str(crow.get("name") or crow.get("slug") or category).strip()
        
        # Use new category-aware prompt builder
        prompts_data = build_prompts_for_product(
            category=prod_category or category or "clothing",
            gender=gender,
            color_hex=colorHex,
            color_name=colorHex,
            image_type="all",
            count=8,  # Maximum 8 photos
        )
        prompts = [p["prompt"] for p in prompts_data]
        
        # Back path handling - if back image provided, use it for back view prompts
        back_path = None
        owns_back_path = False
        if fileBack:
            suffix = os.path.splitext(fileBack.filename or "")[1] or ".jpg"
            fd, back_path = tempfile.mkstemp(suffix=suffix)
            with os.fdopen(fd, "wb") as f:
                f.write(await fileBack.read())
            owns_back_path = True
            # Generate back view prompts using the new system
            back_prompts_data = build_prompts_for_product(
                category=prod_category or category or "clothing",
                gender=gender,
                color_hex=colorHex,
                color_name=colorHex,
                image_type="back",
                count=2,
            )
            back_prompts = [p["prompt"] for p in back_prompts_data]
            prompts = prompts + back_prompts
        
        measurements = None
        try:
            with db_session() as db:
                prow = db.execute(
                    text('SELECT id,name,description,"categoryId" FROM "Product" WHERE id=:id'),
                    {"id": productId},
                ).mappings().first()
                if prow:
                    sizes = db.execute(
                        text('SELECT DISTINCT size FROM "ProductVariant" WHERE "productId"=:pid AND size IS NOT NULL AND TRIM(size) <> \'\' ORDER BY size'),
                        {"pid": productId},
                    ).fetchall()
                    size_list = [str(r[0]) for r in sizes if r and r[0] is not None]
                    cat_name = str(category or "").strip()
                    if prow.get("categoryId"):
                        crow = db.execute(
                            text('SELECT name,slug FROM "Category" WHERE id=:id'),
                            {"id": prow.get("categoryId")},
                        ).mappings().first()
                        if crow:
                            cat_name = str(crow.get("name") or crow.get("slug") or cat_name)
                    if size_list:
                        logger.info("generate-multiple: calling gemini for measurements. product=%s, sizes=%s", prow.get("name"), size_list)
                        measurements = await run_in_threadpool(
                            gemini_service.generate_sewing_measurements,
                            str(prow.get("name") or ""),
                            str(prow.get("description") or ""),
                            cat_name,
                            gender,
                            size_list,
                        )
                        logger.info("generate-multiple: measurements received: %s", json.dumps(measurements, ensure_ascii=False))
                    else:
                        logger.info("generate-multiple: no sizes found for product %s, skipping measurements", productId)
        except Exception as me:
            logger.error("generate-multiple: measurement generation failed for product %s: %s", productId, me, exc_info=True)
            measurements = None

        job_id = str(uuid.uuid4())
        with db_session() as db:
            db.execute(
                text("INSERT INTO batch_jobs (id, total, done, failed, status) VALUES (:id, :t, 0, 0, 'running')"),
                {"id": job_id, "t": len(prompts)},
            )
            db.commit()

        background_tasks.add_task(
            _process_multiple_job,
            job_id, base_path, prompts, productId, gender, colorHex, rgb_str, owns_temp, back_path, owns_back_path,
        )
        return {"jobId": job_id, "status": "running", "total": len(prompts), "measurements": measurements}

    except HTTPException:
        if owns_temp:
            safe_remove(temp_path)
        raise
    except Exception as e:
        if owns_temp:
            safe_remove(temp_path)
        raise HTTPException(500, str(e))


def _process_multiple_job(
    job_id: str,
    base_path: str,
    prompts: list,
    productId: str,
    gender: str,
    colorHex: str,
    rgb_str: str,
    owns_base_path: bool,
    back_path: Optional[str] = None,
    owns_back_path: bool = False,
):
    done = 0
    failed = 0
    try:
        # New prompt system includes back view in the main list
        # Use base_path for front/side/detail views, back_path for back view if available
        back_view_keywords = ["back view", "back of", "facing away", "from behind", "back_full"]
        
        for i, prompt in enumerate(prompts):
            if i > 0:
                _SLEEP_EVENT.wait(BATCH_ITEM_DELAY_S)
            try:
                # Choose image source: use back_path for back view prompts if available
                prompt_lower = prompt.lower()
                is_back_view = any(kw in prompt_lower for kw in back_view_keywords)
                current_path = (back_path or base_path) if (is_back_view and back_path) else base_path
                
                img_bytes = generate_image(current_path, prompt)
                up = upload_result_image(img_bytes)
                with db_session() as db:
                    save_generated_photo(db, productId, up["url"], up["public_id"], gender, colorHex, rgb_str)
                    append_product_image(db, productId, up["url"])
                    db.commit()
                done += 1
            except Exception as e:
                logger.error("generate-multiple job=%s prompt=%d: %s", job_id, i, e)
                failed += 1

            with db_session() as db:
                _update_job(db, job_id, done, failed)

        with db_session() as db:
            _update_job(db, job_id, done, failed, "completed")

    except Exception as e:
        logger.error("generate-multiple job=%s crashed: %s", job_id, e)
        with db_session() as db:
            _update_job(db, job_id, done, len(prompts) - done, "failed")
    finally:
        if owns_base_path:
            safe_remove(base_path)
        if owns_back_path:
            safe_remove(back_path)
