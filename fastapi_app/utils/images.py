"""
Utilities for working with product images.
Supports both legacy format (array of URLs) and new format (array of objects with type).
"""

import json
from typing import List, Dict, Any, Optional, Literal

ImageType = Literal["front", "back", "side", "additional"]


class ProductImage:
    """Represents a single product image with metadata"""
    
    def __init__(
        self,
        url: str,
        type: ImageType = "additional",
        order: int = 0,
        is_generated: bool = False,
        cloudinary_public_id: Optional[str] = None
    ):
        self.url = url
        self.type = type
        self.order = order
        self.is_generated = is_generated
        self.cloudinary_public_id = cloudinary_public_id
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "url": self.url,
            "type": self.type,
            "order": self.order,
            "isGenerated": self.is_generated
        }
        if self.cloudinary_public_id:
            result["cloudinaryPublicId"] = self.cloudinary_public_id
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProductImage":
        """Create from dictionary"""
        return cls(
            url=data.get("url", ""),
            type=data.get("type", "additional"),
            order=data.get("order", 0),
            is_generated=data.get("isGenerated", False),
            cloudinary_public_id=data.get("cloudinaryPublicId")
        )


def parse_product_images(images_json: Optional[str]) -> List[ProductImage]:
    """
    Parse product images from JSON string.
    Supports both legacy format (array of URLs) and new format (array of objects).
    
    Args:
        images_json: JSON string from database
        
    Returns:
        List of ProductImage objects
    """
    if not images_json:
        return []
    
    try:
        data = json.loads(images_json)
    except (json.JSONDecodeError, TypeError):
        return []
    
    if not isinstance(data, list):
        return []
    
    images = []
    for i, item in enumerate(data):
        if isinstance(item, str):
            # Legacy format: just URL string
            # First image is front, rest are additional
            img_type: ImageType = "front" if i == 0 else "additional"
            images.append(ProductImage(url=item, type=img_type, order=i))
        elif isinstance(item, dict):
            # New format: object with metadata
            images.append(ProductImage.from_dict(item))
        else:
            continue
    
    return images


def serialize_product_images(images: List[ProductImage]) -> str:
    """
    Serialize product images to JSON string for database storage.
    
    Args:
        images: List of ProductImage objects
        
    Returns:
        JSON string
    """
    return json.dumps([img.to_dict() for img in images])


def add_product_image(
    images_json: Optional[str],
    url: str,
    type: ImageType = "additional",
    is_generated: bool = False,
    cloudinary_public_id: Optional[str] = None
) -> str:
    """
    Add a new image to product images.
    
    Args:
        images_json: Current images JSON string
        url: Image URL to add
        type: Image type (front/back/side/additional)
        is_generated: Whether image was AI generated
        cloudinary_public_id: Cloudinary public ID if applicable
        
    Returns:
        Updated JSON string
    """
    images = parse_product_images(images_json)
    
    # Determine order
    order = max([img.order for img in images], default=-1) + 1
    
    # If adding front/back/side, check if one already exists
    if type in ["front", "back", "side"]:
        existing = [img for img in images if img.type == type]
        if existing:
            # Replace existing image of this type
            for img in images:
                if img.type == type:
                    img.url = url
                    img.is_generated = is_generated
                    img.cloudinary_public_id = cloudinary_public_id
            return serialize_product_images(images)
    
    # Add new image
    new_image = ProductImage(
        url=url,
        type=type,
        order=order,
        is_generated=is_generated,
        cloudinary_public_id=cloudinary_public_id
    )
    images.append(new_image)
    
    return serialize_product_images(images)


def get_images_by_type(images_json: Optional[str], type: ImageType) -> List[ProductImage]:
    """
    Get all images of a specific type.
    
    Args:
        images_json: Images JSON string
        type: Image type to filter by
        
    Returns:
        List of ProductImage objects of the specified type
    """
    images = parse_product_images(images_json)
    return [img for img in images if img.type == type]


def get_primary_image(images_json: Optional[str]) -> Optional[str]:
    """
    Get the primary image URL (front image or first image).
    
    Args:
        images_json: Images JSON string
        
    Returns:
        Primary image URL or None
    """
    images = parse_product_images(images_json)
    if not images:
        return None
    
    # Try to find front image
    front_images = [img for img in images if img.type == "front"]
    if front_images:
        return front_images[0].url
    
    # Return first image
    return images[0].url


def has_image_type(images_json: Optional[str], type: ImageType) -> bool:
    """
    Check if product has an image of specific type.
    
    Args:
        images_json: Images JSON string
        type: Image type to check
        
    Returns:
        True if image of this type exists
    """
    images = parse_product_images(images_json)
    return any(img.type == type for img in images)


def get_all_image_urls(images_json: Optional[str]) -> List[str]:
    """
    Get all image URLs (for backward compatibility).
    
    Args:
        images_json: Images JSON string
        
    Returns:
        List of image URLs
    """
    images = parse_product_images(images_json)
    return [img.url for img in images]
