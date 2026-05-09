"""
routers/product_images.py — Управление изображениями продуктов.
Поддержка front/back/side изображений с автоматической загрузкой в Cloudinary.
"""
import os
import re
import uuid
import time
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi_app.database import get_db
from fastapi_app.dependencies import require_admin
from fastapi_app.config import MAX_UPLOAD_BYTES
from fastapi_app.utils.images import (
    parse_product_images,
    serialize_product_images,
    add_product_image,
    get_images_by_type,
    ProductImage,
    ImageType
)

router = APIRouter(prefix="/api/v1/products", tags=["product-images"])
logger = logging.getLogger(__name__)

_IMAGE_SIGS = (b'\x89PNG', b'\xff\xd8', b'GIF8', b'RIFF', b'BM', b'\x00\x00\x01\x00')


@router.get("/{product_id}/images")
def get_product_images(product_id: str, db: Session = Depends(get_db)):
    """
    Get all images for a product in new format.
    
    Returns:
        {
            "images": [
                {
                    "url": "",
                    "type": "front",
                    "order": 0,
                    "isGenerated": false
                }
            ]
        }
    """
    row = db.execute(
        text('SELECT images FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = parse_product_images(row.get("images"))
    
    return {
        "images": [img.to_dict() for img in images]
    }


@router.post("/{product_id}/images")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(),
    type: str = Form("additional"),  # front, back, side, additional
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """
    Upload a new image for a product with specified type.
    Automatically uploads to Cloudinary with WebP optimization.
    
    Args:
        product_id: Product ID
        file: Image file
        type: Image type (front/back/side/additional)
        
    Returns:
        {
            "url": "cloudinary_url",
            "type": "front",
            "order": 0,
            "cloudinary": true
        }
    """
    # Validate product exists
    row = db.execute(
        text('SELECT id, images FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate image type
    valid_types = ["front", "back", "side", "additional"]
    if type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Validate file
    content_type = str(file.content_type or "").lower().strip()
    original_name = str(file.filename or "").strip()
    ext = os.path.splitext(original_name)[1].lower()
    
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="unsupported_file_type")
    
    if content_type and content_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise HTTPException(status_code=400, detail="unsupported_content_type")
    
    # Validate image signature
    head = await file.read(16)
    try:
        await file.seek(0)
    except Exception:
        pass
    
    if not head or not any(head.startswith(sig) for sig in _IMAGE_SIGS):
        raise HTTPException(status_code=400, detail="invalid_image_signature")
    
    # Check Cloudinary configuration
    use_cloudinary = all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET"),
    ])
    
    if not use_cloudinary:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary not configured. Image upload requires Cloudinary."
        )
    
    # Upload to Cloudinary
    try:
        from fastapi_app.services.cloudinary_service import upload_image
        
        image_bytes = await file.read()
        
        # Check file size
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="file_too_large")
        
        # Upload with type-specific folder
        public_id = f"products/{product_id}/{type}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        result = upload_image(image_bytes, folder="vinesent", public_id=public_id)
        
        cloudinary_url = result["url"]
        cloudinary_public_id = result["public_id"]
        
        logger.info(
            "Uploaded %s image for product %s to Cloudinary: %s",
            type, product_id, cloudinary_url
        )
        
        # Update product images in database
        current_images_json = row.get("images")
        updated_images_json = add_product_image(
            current_images_json,
            cloudinary_url,
            type=type,  # type: ignore
            is_generated=False,
            cloudinary_public_id=cloudinary_public_id
        )
        
        db.execute(
            text('UPDATE "Product" SET images = :images, "updatedAt" = :updated WHERE id = :id'),
            {
                "images": updated_images_json,
                "updated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "id": product_id
            }
        )
        db.commit()
        
        # Parse to get the added image details
        images = parse_product_images(updated_images_json)
        added_image = next((img for img in images if img.url == cloudinary_url), None)
        
        return {
            "url": cloudinary_url,
            "type": type,
            "order": added_image.order if added_image else 0,
            "cloudinary": True,
            "cloudinaryPublicId": cloudinary_public_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to upload image to Cloudinary")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/{product_id}/images")
def delete_product_image(
    product_id: str,
    url: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """
    Delete an image from a product.
    
    Args:
        product_id: Product ID
        url: Image URL to delete
        
    Returns:
        {"success": true}
    """
    row = db.execute(
        text('SELECT images FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = parse_product_images(row.get("images"))
    
    # Remove image with matching URL
    images = [img for img in images if img.url != url]
    
    if len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete last image. Product must have at least one image."
        )
    
    updated_images_json = serialize_product_images(images)
    
    db.execute(
        text('UPDATE "Product" SET images = :images, "updatedAt" = :updated WHERE id = :id'),
        {
            "images": updated_images_json,
            "updated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "id": product_id
        }
    )
    db.commit()
    
    # Try to delete from Cloudinary if it's a Cloudinary URL
    if "cloudinary.com" in url:
        try:
            from fastapi_app.services.cloudinary_service import delete_image
            # Extract public_id from URL
            # Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
            parts = url.split("/upload/")
            if len(parts) == 2:
                public_id_with_ext = parts[1].split("/", 1)[-1]
                public_id = os.path.splitext(public_id_with_ext)[0]
                delete_image(public_id)
                logger.info("Deleted image from Cloudinary: %s", public_id)
        except Exception as e:
            logger.warning("Failed to delete image from Cloudinary: %s", e)
    
    return {"success": True}


@router.get("/{product_id}/images/{type}")
def get_product_images_by_type(
    product_id: str,
    type: str,
    db: Session = Depends(get_db)
):
    """
    Get images of a specific type for a product.
    
    Args:
        product_id: Product ID
        type: Image type (front/back/side/additional)
        
    Returns:
        {
            "images": []
        }
    """
    valid_types = ["front", "back", "side", "additional"]
    if type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Must be one of: {', '.join(valid_types)}"
        )
    
    row = db.execute(
        text('SELECT images FROM "Product" WHERE id = :id'),
        {"id": product_id}
    ).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = get_images_by_type(row.get("images"), type)  # type: ignore
    
    return {
        "images": [img.to_dict() for img in images]
    }
