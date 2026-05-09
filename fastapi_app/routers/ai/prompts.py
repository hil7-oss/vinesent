"""
routers/prompts.py — Admin API for managing AI prompts.

Endpoints:
  GET  /api/admin/prompts                     — full prompts.json dump
  POST /api/admin/prompts/raw                 — overwrite full prompts.json
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
from fastapi_app.services.photo_prompts import (
    ACCENT_LABELS,
    build_prompts_for_product,
    get_accent_views,
    get_default_gender_blocks,
    get_default_strict_block,
    get_view_label,
)
from fastapi_app.services.prompt_service import get_accent_labels as _get_accent_labels

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
    "virtual_try_on": "Virtual try-on",
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


@router.post("/raw")
def update_all_prompts(body: dict):
    """Overwrite full prompts.json content."""
    photo = body.get("photo")
    seo = body.get("seo")
    prompt_service.save_prompts(photo=photo, seo=seo)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _accent_exists(accent: str) -> bool:
    """Check accent exists in photo prompts data (custom, default, or accent_labels)."""
    custom = prompt_service.load_custom_photo_prompts()
    defaults = prompt_service.load_default_photo_prompts()
    return (
        (accent in custom and isinstance(custom[accent], dict))
        or (accent in defaults and isinstance(defaults[accent], dict))
        or accent in _get_accent_labels()
    )


def _require_accent(accent: str):
    if not _accent_exists(accent):
        raise HTTPException(404, f"Unknown accent: {accent}")


def _require_view(accent: str, view: str):
    if view not in get_accent_views(accent):
        raise HTTPException(404, f"Unknown view '{view}' for accent '{accent}'")


# ---------------------------------------------------------------------------
# View management (add / delete / reorder)
# ---------------------------------------------------------------------------

class CreateViewBody(BaseModel):
    view: str
    label: str = ""
    prompt: str = ""


class ReorderViewsBody(BaseModel):
    views: list[str]


class UpdateLabelBody(BaseModel):
    label: str


class BodyViewBody(BaseModel):
    accent: str
    view: str


class BodyPromptBody(BodyViewBody):
    prompt: str


class BodyLabelBody(BodyViewBody):
    label: str


class CreateAccentBody(BaseModel):
    accent: str
    label: str = ""


class UpdateGenderBlocksBody(BaseModel):
    boy: str = ""
    girl: str = ""
    unisex: str = ""


@router.post("/photo/{accent}/views")
def create_photo_view(accent: str, body: CreateViewBody):
    """Add a new view (ракурс) to an accent."""
    _require_accent(accent)
    view_key = body.view.strip()
    if not view_key:
        raise HTTPException(400, "view key cannot be empty")
    if view_key.startswith("_"):
        raise HTTPException(400, "view key cannot start with '_'")
    if view_key in get_accent_views(accent):
        raise HTTPException(409, f"View '{view_key}' already exists for accent '{accent}'")
    label = body.label.strip() or view_key
    prompt = body.prompt.strip() or ""
    prompt_service.create_photo_view(accent, view_key, label, prompt)
    return {"ok": True, "accent": accent, "view": view_key}


@router.put("/photo/{accent}/{view}/label")
def update_view_label(accent: str, view: str, body: UpdateLabelBody):
    """Update the display label for a view."""
    _require_accent(accent)
    _require_view(accent, view)
    label = body.label.strip()
    if not label:
        raise HTTPException(400, "label cannot be empty")
    prompt_service.update_photo_view_label(accent, view, label)
    return {"ok": True, "accent": accent, "view": view, "label": label}


@router.put("/photo/{accent}/reorder")
def reorder_photo_views(accent: str, body: ReorderViewsBody):
    """Set the display order of views for an accent."""
    _require_accent(accent)
    if not body.views:
        raise HTTPException(400, "views list cannot be empty")
    prompt_service.update_photo_view_order(accent, body.views)
    return {"ok": True, "accent": accent}


@router.delete("/photo/{accent}/{view}/delete")
def delete_photo_view(accent: str, view: str):
    """Permanently remove a view (ракурс) from an accent (path-based)."""
    _require_accent(accent)
    _require_view(accent, view)
    prompt_service.delete_photo_view(accent, view)
    return {"ok": True, "accent": accent, "view": view, "deleted": True}


# ---------------------------------------------------------------------------
# Body-based equivalents for views with special chars (e.g. "3/4")
#   Next.js rewrites decode %2F in :path*, so path params break for "/".
#   These pass accent + view in the request body to avoid URL encoding issues.
# ---------------------------------------------------------------------------

@router.put("/photo/view/set-prompt")
def set_photo_prompt_body(body: BodyPromptBody):
    """Save custom prompt override — accent/view in body (avoids URL encoding)."""
    _require_accent(body.accent)
    _require_view(body.accent, body.view)
    if not body.prompt.strip():
        raise HTTPException(400, "prompt cannot be empty")
    prompt_service.set_photo_prompt_override(body.accent, body.view, body.prompt.strip())
    return {"ok": True, "accent": body.accent, "view": body.view}


@router.delete("/photo/view/reset")
def reset_photo_view_body(body: BodyViewBody):
    """Reset single view to default — accent/view in body."""
    _require_accent(body.accent)
    prompt_service.reset_photo_prompt_override(body.accent, body.view)
    return {"ok": True, "accent": body.accent, "view": body.view, "reset": True}


@router.delete("/photo/view/delete")
def delete_photo_view_body(body: BodyViewBody):
    """Permanently remove a view — accent/view in body."""
    _require_accent(body.accent)
    _require_view(body.accent, body.view)
    prompt_service.delete_photo_view(body.accent, body.view)
    return {"ok": True, "accent": body.accent, "view": body.view, "deleted": True}


@router.put("/photo/view/label")
def update_view_label_body(body: BodyLabelBody):
    """Update display label for a view — accent/view in body."""
    _require_accent(body.accent)
    _require_view(body.accent, body.view)
    label = body.label.strip()
    if not label:
        raise HTTPException(400, "label cannot be empty")
    prompt_service.update_photo_view_label(body.accent, body.view, label)
    return {"ok": True, "accent": body.accent, "view": body.view, "label": label}


# ---------------------------------------------------------------------------
# Accent CRUD (create / delete whole accent blocks)
# ---------------------------------------------------------------------------

@router.post("/photo/{accent}/block")
def create_accent_block(accent: str, body: CreateAccentBody):
    """Create a new empty accent block."""
    if _accent_exists(accent):
        raise HTTPException(409, f"Accent '{accent}' already exists")
    label = body.label.strip() or accent
    prompt_service.create_photo_accent(accent, label)
    return {"ok": True, "accent": accent, "label": label}


@router.delete("/photo/{accent}/block")
def delete_accent_block(accent: str):
    """Permanently remove an entire accent block."""
    _require_accent(accent)
    prompt_service.delete_photo_accent(accent)
    return {"ok": True, "accent": accent, "deleted": True}


# ---------------------------------------------------------------------------
# Gender blocks
# ---------------------------------------------------------------------------

@router.put("/photo/defaults/gender")
def update_gender_blocks(body: UpdateGenderBlocksBody):
    """Update gender description blocks (boy/girl/unisex)."""
    blocks = {}
    if body.boy:
        blocks["_gender_boy"] = body.boy
    if body.girl:
        blocks["_gender_girl"] = body.girl
    if body.unisex:
        blocks["_gender_unisex"] = body.unisex
    prompt_service.update_gender_blocks(blocks)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Photo prompts
# ---------------------------------------------------------------------------

@router.get("/photo")
def get_photo_prompts_overview():
    """Return overview of all photo prompts with accent/view metadata and custom status."""
    custom = prompt_service.load_custom_photo_prompts()
    defaults = prompt_service.load_default_photo_prompts()
    dynamic_labels = _get_accent_labels()
    all_accents: set[str] = set()
    for d in (custom, defaults):
        if isinstance(d, dict):
            all_accents.update(k for k in d if isinstance(d[k], dict))
    all_accents.update(dynamic_labels.keys())
    result = {}
    for accent in sorted(all_accents):
        label = dynamic_labels.get(accent) or ACCENT_LABELS.get(accent, accent)
        result[accent] = {
            "label": label,
            "views": [
                {
                    "view": v,
                    "has_custom": custom.get(accent, {}).get(v) != defaults.get(accent, {}).get(v),
                }
                for v in get_accent_views(accent)
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
    _require_accent(accent)
    defaults = prompt_service.load_default_photo_prompts()
    accent_defaults = defaults.get(accent, {})
    dynamic_labels = _get_accent_labels()
    label = dynamic_labels.get(accent) or ACCENT_LABELS.get(accent, accent)
    return {
        "accent": accent,
        "label": label,
        "views": [
            {"view": view, "label": get_view_label(accent, view), "prompt": accent_defaults.get(view, "")}
            for view in get_accent_views(accent)
        ],
    }


@router.get("/photo/{accent}")
def get_photo_accent(accent: str):
    """Return current (custom or default) prompts for given accent."""
    _require_accent(accent)
    custom = prompt_service.load_custom_photo_prompts()
    defaults = prompt_service.load_default_photo_prompts()
    samples = build_prompts_for_product(
        category="product",
        gender="male",
        color_hex="#000000",
        image_type=accent,
    )
    dynamic_labels = _get_accent_labels()
    label = dynamic_labels.get(accent) or ACCENT_LABELS.get(accent, accent)
    return {
        "accent": accent,
        "label": label,
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
    _require_accent(accent)
    _require_view(accent, view)
    if not body.prompt.strip():
        raise HTTPException(400, "prompt cannot be empty")
    prompt_service.set_photo_prompt_override(accent, view, body.prompt.strip())
    return {"ok": True, "accent": accent, "view": view}


@router.delete("/photo/{accent}/{view}")
def reset_photo_prompt_view(accent: str, view: str):
    """Reset a single view to built-in default."""
    _require_accent(accent)
    prompt_service.reset_photo_prompt_override(accent, view)
    return {"ok": True, "accent": accent, "view": view, "reset": True}


@router.delete("/photo/{accent}")
def reset_photo_accent(accent: str):
    """Reset all views for given accent to built-in defaults."""
    _require_accent(accent)
    prompt_service.reset_photo_prompt_override(accent, view=None)
    return {"ok": True, "accent": accent, "reset": True}


@router.post("/photo/preview")
def preview_photo_prompt(body: PhotoPreviewBody):
    """Preview the rendered prompt for given accent/view with real substituted values."""
    _require_accent(body.accent)
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
