import cloudinary
import cloudinary.uploader
import os
from io import BytesIO

def init_cloudinary():
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )

def upload_image(image_bytes: bytes, folder: str, public_id: str) -> dict:
    """Uploads image bytes to Cloudinary with automatic optimization. Returns url and public_id."""
    init_cloudinary()
    result = cloudinary.uploader.upload(
        BytesIO(image_bytes),
        folder=folder,
        public_id=public_id,
        overwrite=True,
        resource_type="image",
        # Автоматическая оптимизация
        format="webp",  # Конвертация в WebP
        quality="auto:good",  # Автоматическое качество (80-85%)
        fetch_format="auto",  # Автоматический формат для браузера
        flags="progressive",  # Прогрессивная загрузка
        # Создаем responsive версии
        responsive_breakpoints={
            "create_derived": True,
            "bytes_step": 20000,
            "min_width": 200,
            "max_width": 1000,
            "max_images": 5
        }
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "responsive_breakpoints": result.get("responsive_breakpoints", [])
    }

def delete_image(public_id: str):
    init_cloudinary()
    cloudinary.uploader.destroy(public_id)


def get_optimized_url(public_id: str, width: int = None, quality: str = "auto:good") -> str:
    """
    Получает оптимизированный URL изображения из Cloudinary
    
    Args:
        public_id: ID изображения в Cloudinary
        width: Ширина (опционально)
        quality: Качество (auto:good, auto:best, auto:eco, или число 1-100)
    
    Returns:
        Оптимизированный URL
    """
    init_cloudinary()
    
    transformations = {
        "fetch_format": "auto",  # Автоматический формат (WebP для поддерживающих браузеров)
        "quality": quality,
        "flags": "progressive"
    }
    
    if width:
        transformations["width"] = width
        transformations["crop"] = "limit"  # Не увеличивать, только уменьшать
    
    url = cloudinary.CloudinaryImage(public_id).build_url(**transformations)
    return url


def get_responsive_urls(public_id: str) -> dict:
    """
    Получает набор URL для responsive изображений
    
    Returns:
        {
            "thumbnail": "url",  # 200px
            "small": "url",      # 400px
            "medium": "url",     # 800px
            "large": "url",      # 1200px
            "original": "url"    # Оптимизированный оригинал
        }
    """
    return {
        "thumbnail": get_optimized_url(public_id, width=200, quality="auto:eco"),
        "small": get_optimized_url(public_id, width=400, quality="auto:good"),
        "medium": get_optimized_url(public_id, width=800, quality="auto:good"),
        "large": get_optimized_url(public_id, width=1200, quality="auto:good"),
        "original": get_optimized_url(public_id, quality="auto:best")
    }
