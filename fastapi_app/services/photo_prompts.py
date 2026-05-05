"""
Photo prompt builder.

Prompt templates are loaded from data/prompts.json, which is seeded from
data/default_prompts.json on startup and then edited through the admin UI.
"""
from __future__ import annotations

from typing import Optional

from .prompt_service import load_custom_photo_prompts, render_prompt

ACCENT_VIEWS = {
    "top": ["front", "back", "3/4", "full_body", "detail", "casual"],
    "bottom": ["front", "back", "3/4", "detail", "walking", "casual"],
    "accessory": ["front", "detail", "in_use", "side", "lifestyle", "styled"],
    "set": [
        "full_front",
        "full_back",
        "full_3/4",
        "detail_top",
        "detail_bottom",
        "full_casual",
        "walking",
        "lifestyle",
    ],
}

ACCENT_LABELS = {
    "top": "Верх",
    "bottom": "Низ",
    "accessory": "Аксесуари",
    "set": "Сет / образ",
}

VIEW_LABELS = {
    "front": "Спереду",
    "back": "Ззаду",
    "3/4": "3/4 ракурс",
    "full_body": "Повний зріст",
    "detail": "Деталі",
    "casual": "Повсякденний образ",
    "walking": "Крок",
    "in_use": "У використанні",
    "side": "Збоку",
    "lifestyle": "Lifestyle",
    "styled": "Стилізований",
    "full_front": "Повний спереду",
    "full_back": "Повний ззаду",
    "full_3/4": "Повний 3/4",
    "detail_top": "Деталі верху",
    "detail_bottom": "Деталі низу",
    "full_casual": "Повсякденний повний",
}


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
    accent_data = photo.get(accent, {})
    if not isinstance(accent_data, dict):
        return []

    context = {
        "item": category or accent,
        "gen": _gender(gender, photo),
        "color_hex": color_hex,
        "STRICT": str(photo.get("_strict") or ""),
    }

    prompts: list[dict] = []
    ordered_views = ACCENT_VIEWS.get(accent, list(accent_data.keys()))
    for view in ordered_views:
        template = accent_data.get(view)
        if not template:
            continue
        prompts.append(
            {
                "view": view,
                "label": VIEW_LABELS.get(view, view),
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


def build_prompts_for_product(
    category: str = "clothing",
    gender: str = "unisex",
    color_hex: str = "#000000",
    color_name: str = "colorful",
    image_type: str = "top",
    count: Optional[int] = None,
) -> list[dict]:
    accent = image_type if image_type in ACCENT_VIEWS else _detect_accent(category)
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
