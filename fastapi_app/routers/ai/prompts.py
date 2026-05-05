"""
routers/prompts.py — Admin API for managing AI prompts.

Endpoints:
  GET  /api/admin/prompts                     — full prompts.json dump
  GET  /api/admin/prompts/photo               — photo prompts overview
  GET  /api/admin/prompts/photo/{accent}      — all views for accent
  PUT  /api/admin/prompts/photo/{accent}/{view} — set custom prompt for view
  DELETE /api/admin/prompts/photo/{accent}/{view} — reset to default
  DELETE /api/admin/prompts/photo/{accent}    — reset all views for accent to default
  GET  /api/admin/prompts/photo/defaults/{accent} — get built-in defaults (no custom applied)

  GET  /api/admin/prompts/seo                 — seo prompts overview
  PUT  /api/admin/prompts/seo/{key}           — set custom seo prompt
  DELETE /api/admin/prompts/seo/{key}         — reset to default
  GET  /api/admin/prompts/seo/defaults        — get built-in seo defaults
  POST /api/admin/prompts/seo/preview         — preview rendered seo prompt

  POST /api/admin/prompts/photo/preview       — preview rendered photo prompt
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from fastapi_app.dependencies import require_admin
from fastapi_app.services import prompt_service
from ...services.photo_prompts import (
    ACCENT_LABELS,
    ACCENT_VIEWS,
    VIEW_LABELS,
    build_prompts_for_product,
    get_default_gender_blocks,
    get_default_strict_block,
)

router = APIRouter(
    prefix="/api/admin/prompts",
    tags=["prompts"],
    dependencies=[Depends(require_admin)],
)
logger = logging.getLogger(__name__)

SEO_KEYS = {
    "generate_seo_text": "SEO metadata",
    "generate_product_content": "Product content",
    "parse_product_autofill": "Product autofill",
    "generate_sewing_measurements": "Sewing measurements",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SetPromptBody(BaseModel):
    prompt: str


class PhotoPreviewBody(BaseModel):
    accent: str = "top"
    view: str = "front"
    category: str = "Футболка"
    gender: str = "male"
    color_hex: str = "#3A5FCD"


class SeoPreviewBody(BaseModel):
    key: str
    product_name: str = "Дитяча куртка"
    product_description: str = "Зимова куртка для хлопчиків 7-12 років"
    category: str = "Куртки"
    seed_text: str = ""
    audience: str = "унісекс"
    brand: str = "VINESENT"


# ---------------------------------------------------------------------------
# Full dump
# ---------------------------------------------------------------------------

@router.get("")
def get_all_prompts():
    """Return full prompts.json content."""
    return {
        "photo": prompt_service.load_custom_photo_prompts(),
        "seo": prompt_service.load_custom_seo_prompts(),
    }


# ---------------------------------------------------------------------------
# Photo prompts
# ---------------------------------------------------------------------------

@router.get("/photo")
def get_photo_prompts_overview():
    """Return overview of all photo prompts with accent/view metadata and custom status."""
    custom = prompt_service.load_custom_photo_prompts()
    defaults = prompt_service.load_default_photo_prompts()
    result = {}
    for accent, views in ACCENT_VIEWS.items():
        result[accent] = {
            "label": ACCENT_LABELS[accent],
            "views": [
                {
                    "view": v,
                    "has_custom": custom.get(accent, {}).get(v) != defaults.get(accent, {}).get(v),
                }
                for v in views
            ],
        }
    return result


@router.get("/photo/defaults/strict")
def get_strict_block():
    """Return the built-in _STRICT verification block."""
    return {"strict": get_default_strict_block()}


@router.get("/photo/defaults/gender")
def get_gender_blocks():
    """Return the built-in gender description blocks."""
    return get_default_gender_blocks()


@router.get("/photo/defaults/{accent}")
def get_photo_defaults(accent: str):
    """
    Return built-in default prompts for given accent (no custom overrides applied).
    Useful to show original text when resetting.
    """
    if accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {accent}")
    defaults = prompt_service.load_default_photo_prompts()
    accent_defaults = defaults.get(accent, {})
    return {
        "accent": accent,
        "label": ACCENT_LABELS[accent],
        "views": [
            {"view": view, "label": VIEW_LABELS.get(view, view), "prompt": accent_defaults.get(view, "")}
            for view in ACCENT_VIEWS[accent]
        ],
    }


@router.get("/photo/{accent}")
def get_photo_accent(accent: str):
    """Return current (custom or default) prompts for given accent."""
    if accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {accent}")
    custom = prompt_service.load_custom_photo_prompts()
    defaults = prompt_service.load_default_photo_prompts()
    samples = build_prompts_for_product(
        category="product",
        gender="male",
        color_hex="#000000",
        image_type=accent,
    )
    return {
        "accent": accent,
        "label": ACCENT_LABELS[accent],
        "views": [
            {
                "view": p["view"],
                "label": p["label"],
                "prompt": p["prompt"],
                "has_custom": custom.get(accent, {}).get(p["view"]) != defaults.get(accent, {}).get(p["view"]),
            }
            for p in samples
        ],
    }


@router.put("/photo/{accent}/{view}")
def set_photo_prompt(accent: str, view: str, body: SetPromptBody):
    """Save custom prompt override for accent/view."""
    if accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {accent}")
    if view not in ACCENT_VIEWS[accent]:
        raise HTTPException(404, f"Unknown view '{view}' for accent '{accent}'")
    if not body.prompt.strip():
        raise HTTPException(400, "prompt cannot be empty")
    prompt_service.set_photo_prompt_override(accent, view, body.prompt.strip())
    return {"ok": True, "accent": accent, "view": view}


@router.delete("/photo/{accent}/{view}")
def reset_photo_prompt_view(accent: str, view: str):
    """Reset a single view to built-in default."""
    if accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {accent}")
    prompt_service.reset_photo_prompt_override(accent, view)
    return {"ok": True, "accent": accent, "view": view, "reset": True}


@router.delete("/photo/{accent}")
def reset_photo_accent(accent: str):
    """Reset all views for given accent to built-in defaults."""
    if accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {accent}")
    prompt_service.reset_photo_prompt_override(accent, view=None)
    return {"ok": True, "accent": accent, "reset": True}


@router.post("/photo/preview")
def preview_photo_prompt(body: PhotoPreviewBody):
    """Preview the rendered prompt for given accent/view with real substituted values."""
    if body.accent not in ACCENT_VIEWS:
        raise HTTPException(404, f"Unknown accent: {body.accent}")
    prompts = build_prompts_for_product(
        category=body.category,
        gender=body.gender,
        color_hex=body.color_hex,
        image_type=body.accent,
    )
    match = next((p for p in prompts if p["view"] == body.view), None)
    if not match:
        raise HTTPException(404, f"View '{body.view}' not found for accent '{body.accent}'")
    return {
        "accent": body.accent,
        "view": body.view,
        "rendered": match["prompt"],
    }


# ---------------------------------------------------------------------------
# SEO prompts
# ---------------------------------------------------------------------------

@router.get("/seo")
def get_seo_prompts_overview():
    """Return overview of SEO prompts with custom status."""
    custom = prompt_service.load_custom_seo_prompts()
    defaults = prompt_service.load_default_seo_prompts()
    result = []
    for key, label in SEO_KEYS.items():
        result.append({
            "key": key,
            "label": label,
            "prompt": custom.get(key) or "",
            "has_custom": custom.get(key) != defaults.get(key),
        })
    return result


@router.get("/seo/defaults")
def get_seo_defaults():
    """Return all built-in SEO prompt defaults."""
    defaults = prompt_service.load_default_seo_prompts()
    return [
        {"key": k, "label": SEO_KEYS[k], "prompt": defaults.get(k, "")}
        for k in SEO_KEYS
    ]


@router.get("/seo/{key}")
def get_seo_prompt_by_key(key: str):
    """Return current (custom or default) SEO prompt for given key."""
    if key not in SEO_KEYS:
        raise HTTPException(404, f"Unknown SEO key: {key}. Valid: {list(SEO_KEYS)}")
    custom = prompt_service.get_seo_prompt(key)
    default = prompt_service.load_default_seo_prompts().get(key)
    return {
        "key": key,
        "label": SEO_KEYS[key],
        "prompt": custom or "",
        "has_custom": custom != default,
    }


@router.put("/seo/{key}")
def set_seo_prompt_by_key(key: str, body: SetPromptBody):
    """Save custom SEO prompt."""
    if key not in SEO_KEYS:
        raise HTTPException(404, f"Unknown SEO key: {key}")
    if not body.prompt.strip():
        raise HTTPException(400, "prompt cannot be empty")
    prompt_service.set_seo_prompt(key, body.prompt.strip())
    return {"ok": True, "key": key}


@router.delete("/seo/{key}")
def reset_seo_prompt_by_key(key: str):
    """Reset SEO prompt to built-in default."""
    if key not in SEO_KEYS:
        raise HTTPException(404, f"Unknown SEO key: {key}")
    prompt_service.reset_seo_prompt(key)
    return {"ok": True, "key": key, "reset": True}


@router.delete("/seo")
def reset_all_seo_prompts():
    """Reset all SEO prompts to built-in defaults."""
    prompt_service.reset_seo_prompt(None)
    return {"ok": True, "reset": True}


@router.post("/seo/preview")
def preview_seo_prompt(body: SeoPreviewBody):
    """
    Preview the rendered SEO prompt with variable substitution.
    Does NOT call Gemini — just returns the filled-in prompt string.
    """
    if body.key not in SEO_KEYS:
        raise HTTPException(404, f"Unknown SEO key: {body.key}")
    template = prompt_service.get_required_seo_prompt(body.key)
    default = prompt_service.load_default_seo_prompts().get(body.key)
    rendered = prompt_service.render_prompt(
        template,
        product_name=body.product_name,
        product_description=body.product_description,
        category=body.category,
        seed_text=body.seed_text,
        audience=body.audience,
        brand=body.brand,
    )
    return {
        "key": body.key,
        "rendered": rendered,
        "has_custom": template != default,
    }
