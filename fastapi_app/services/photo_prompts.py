"""
Photo prompt builder.

Prompt templates are loaded from data/prompts.json, which is seeded from
data/default_prompts.json on startup and then edited through the admin UI.

Views (ракурсы) per accent are managed dynamically via the admin UI —
add, remove, reorder, and label them through the JSON data.
"""
from __future__ import annotations

from typing import Optional

from .prompt_service import load_custom_photo_prompts, load_default_photo_prompts, render_prompt

ACCENT_LABELS = {
    "top": "Верх",
    "bottom": "Низ",
    "accessory": "Аксесуари",
    "set": "Сет / образ",
}


def get_accent_views(accent: str) -> list[str]:
    """Get ordered list of view keys for an accent — from JSON only. No hardcoded fallback."""
    defaults = load_default_photo_prompts().get(accent, {})
    custom = load_custom_photo_prompts().get(accent, {})
    if not isinstance(defaults, dict):
        defaults = {}
    if not isinstance(custom, dict):
        custom = {}

    # Union of all non-underscore view keys
    view_keys: set[str] = set()
    for data in (defaults, custom):
        for k in data:
            if not k.startswith("_"):
                view_keys.add(k)

    if not view_keys:
        return []

    # Order: custom _order > default _order > sorted keys
    order_source = custom.get("_order") or defaults.get("_order") or []

    ordered: list[str] = []
    seen: set[str] = set()
    if order_source:
        for k in order_source:
            if k in view_keys and k not in seen:
                ordered.append(k)
                seen.add(k)
    for k in sorted(view_keys):
        if k not in seen:
            ordered.append(k)
            seen.add(k)
    return ordered


def get_view_label(accent: str, view: str) -> str:
    """Get display label for a view from JSON metadata. Falls back to view key only."""
    for source in (load_custom_photo_prompts, load_default_photo_prompts):
        data = source().get(accent, {})
        if isinstance(data, dict):
            labels = data.get("_labels", {})
            if isinstance(labels, dict) and view in labels:
                return str(labels[view])
    return view


def _detect_accent(category: str) -> str:
    cat = (category or "").lower().strip()
    tops = {
        "shirt",
        "tshirt",
        "t-shirt",
        "tee",
        "polo",
        "jacket",
        "hoodie",
        "sweater",
        "sweatshirt",
        "vest",
        "coat",
        "blazer",
        "cardigan",
        "pullover",
        "top",
        "blouse",
        "dress",
        "рубаш",
        "сороч",
        "футбол",
        "куртк",
        "худі",
        "светр",
        "толстов",
        "жилет",
        "пальт",
        "плат",
        "сукн",
        "кофт",
        "лонгслів",
    }
    bottoms = {
        "pants",
        "trousers",
        "jeans",
        "shorts",
        "skirt",
        "leggings",
        "joggers",
        "cargo",
        "chinos",
        "bottom",
        "штаны",
        "брюк",
        "джинс",
        "шорт",
        "юбк",
        "спідниц",
        "легін",
        "карго",
    }
    accessories = {
        "hat",
        "cap",
        "beanie",
        "bag",
        "backpack",
        "belt",
        "scarf",
        "gloves",
        "socks",
        "tie",
        "bow",
        "accessory",
        "шапк",
        "кепк",
        "сумк",
        "рюкзак",
        "ремн",
        "пояс",
        "шарф",
        "перчат",
        "рукавич",
        "носк",
        "шкарпет",
        "аксес",
    }

    if any(token in cat for token in tops):
        return "top"
    if any(token in cat for token in bottoms):
        return "bottom"
    if any(token in cat for token in accessories):
        return "accessory"
    return "top"


def _gender(gender: str, photo: dict) -> str:
    g = (gender or "").lower().strip()
    if g in ("male", "boy", "він", "хлопчик"):
        return str(photo.get("_gender_boy") or "")
    if g in ("female", "girl", "вона", "дівчинка"):
        return str(photo.get("_gender_girl") or "")
    return str(photo.get("_gender_unisex") or "")


def _build_accent_prompts(accent: str, gender: str, category: str, color_hex: str) -> list[dict]:
    photo = load_custom_photo_prompts()
    defaults = load_default_photo_prompts()

    accent_data = photo.get(accent, {})
    if not isinstance(accent_data, dict):
        accent_data = {}
    default_accent = defaults.get(accent, {})
    if not isinstance(default_accent, dict):
        default_accent = {}

    context = {
        "item": category or accent,
        "gen": _gender(gender, photo),
        "color_hex": color_hex,
        "STRICT": str(photo.get("_strict") or ""),
    }

    prompts: list[dict] = []
    for view in get_accent_views(accent):
        template = accent_data.get(view) or default_accent.get(view)
        if not template:
            continue
        prompts.append(
            {
                "view": view,
                "label": get_view_label(accent, view),
                "prompt": render_prompt(str(template), **context),
            }
        )
    return prompts


def _top_prompts(gender: str, category: str, color_hex: str, custom: dict) -> list[dict]:
    return _build_accent_prompts("top", gender, category, color_hex)


def _bottom_prompts(gender: str, category: str, color_hex: str, custom: dict) -> list[dict]:
    return _build_accent_prompts("bottom", gender, category, color_hex)


def _accessory_prompts(gender: str, category: str, color_hex: str, custom: dict) -> list[dict]:
    return _build_accent_prompts("accessory", gender, category, color_hex)


def _set_prompts(gender: str, category: str, color_hex: str, custom: dict) -> list[dict]:
    return _build_accent_prompts("set", gender, category, color_hex)


def _valid_accent(accent: str) -> bool:
    """Check if accent exists in JSON data."""
    photo = load_custom_photo_prompts()
    defaults = load_default_photo_prompts()
    return (
        accent in photo if isinstance(photo.get(accent), dict) else
        accent in defaults if isinstance(defaults.get(accent), dict) else
        False
    )


def build_prompts_for_product(
    category: str = "clothing",
    gender: str = "unisex",
    color_hex: str = "#000000",
    color_name: str = "colorful",
    image_type: str = "top",
    count: Optional[int] = None,
) -> list[dict]:
    accent = image_type if _valid_accent(image_type) else _detect_accent(category)
    prompts = _build_accent_prompts(accent, gender, category, color_hex)
    return prompts[:count] if count is not None else prompts


def build_prompts(rgb_str: str) -> list[str]:
    return [p["prompt"] for p in build_prompts_for_product(color_hex=rgb_str)]


def get_default_strict_block() -> str:
    return str(load_custom_photo_prompts().get("_strict") or "")


def get_default_gender_blocks() -> dict:
    photo = load_custom_photo_prompts()
    return {
        "boy": str(photo.get("_gender_boy") or ""),
        "girl": str(photo.get("_gender_girl") or ""),
        "unisex": str(photo.get("_gender_unisex") or ""),
    }
