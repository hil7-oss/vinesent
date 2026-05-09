
def render_prompt(template: str, **kwargs) -> str:
    """
    Renders a prompt template with the given context arguments.
    Usage: render_prompt("Hello {name}", name="World")
    """
    prompt = template
    for key, value in kwargs.items():
        if value:
            prompt = prompt.replace(f"{{{key}}}", str(value))
    return prompt

import json
import os
from pathlib import Path

# Paths
_DATA_DIR = Path(__file__).parent.parent / "data"
_PROMPTS_JSON = _DATA_DIR / "prompts.json"
_DEFAULT_PROMPTS_JSON = _DATA_DIR / "default_prompts.json"


def load_custom_photo_prompts() -> dict:
    """Load custom photo prompts from data/prompts.json"""
    try:
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("photo", {})
    except Exception:
        pass
    return {}


def load_default_photo_prompts() -> dict:
    """Load default photo prompts from data/default_prompts.json"""
    try:
        if _DEFAULT_PROMPTS_JSON.exists():
            with open(_DEFAULT_PROMPTS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("photo", {})
    except Exception:
        pass
    return {}


def load_custom_seo_prompts() -> dict:
    """Load custom SEO prompts from data/prompts.json"""
    try:
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("seo", {})
    except Exception:
        pass
    return {}


def load_default_seo_prompts() -> dict:
    """Load default SEO prompts from data/default_prompts.json"""
    try:
        if _DEFAULT_PROMPTS_JSON.exists():
            with open(_DEFAULT_PROMPTS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("seo", {})
    except Exception:
        pass
    return {}


def save_prompts(photo: dict = None, seo: dict = None):
    """Save prompts to data/prompts.json"""
    try:
        # Load existing
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)
        
        # Update
        if photo is not None:
            existing["photo"] = photo
        if seo is not None:
            existing["seo"] = seo
        
        # Save
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to save prompts: {e}")


def get_seo_prompt(key: str) -> str:
    """Get SEO prompt by key (custom or default)"""
    custom = load_custom_seo_prompts()
    if key in custom:
        return str(custom[key])
    defaults = load_default_seo_prompts()
    if key in defaults:
        return str(defaults[key])
    return ""


def get_required_seo_prompt(key: str) -> str:
    """Get SEO prompt by key, raise if not found"""
    result = get_seo_prompt(key)
    if not result:
        raise KeyError(f"SEO prompt '{key}' not found")
    return result


def set_photo_prompt_override(accent: str, view: str, prompt: str):
    """Set custom photo prompt override"""
    try:
        # Load existing
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)
        
        # Update
        if "photo" not in existing:
            existing["photo"] = {}
        if accent not in existing["photo"]:
            existing["photo"][accent] = {}
        existing["photo"][accent][view] = prompt
        
        # Save
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to set photo prompt: {e}")


def reset_photo_prompt_override(accent: str, view: str = None):
    """Reset photo prompt to default (if view is None, reset all views for accent)"""
    try:
        if not _PROMPTS_JSON.exists():
            return
        
        with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
            existing = json.load(f)
        
        if "photo" not in existing:
            return
        
        if view is None:
            # Reset all views for accent
            if accent in existing["photo"]:
                del existing["photo"][accent]
        else:
            # Reset specific view
            if accent in existing["photo"] and view in existing["photo"][accent]:
                del existing["photo"][accent][view]
                # Clean up empty accent
                if not existing["photo"][accent]:
                    del existing["photo"][accent]
        
        # Save
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to reset photo prompt: {e}")


def set_seo_prompt(key: str, prompt: str):
    """Set custom SEO prompt"""
    try:
        # Load existing
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)
        
        # Update
        if "seo" not in existing:
            existing["seo"] = {}
        existing["seo"][key] = prompt
        
        # Save
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to set SEO prompt: {e}")


def reset_seo_prompt(key: str = None):
    """Reset SEO prompt to default (if key is None, reset all)"""
    try:
        if not _PROMPTS_JSON.exists():
            return
        
        with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
            existing = json.load(f)
        
        if "seo" not in existing:
            return
        
        if key is None:
            # Reset all
            existing["seo"] = {}
        else:
            # Reset specific key
            if key in existing["seo"]:
                del existing["seo"][key]
        
        # Save
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to reset SEO prompt: {e}")


# ---------------------------------------------------------------------------
# View management (dynamic ракурсы)
# ---------------------------------------------------------------------------

def create_photo_view(accent: str, view_key: str, label: str, prompt_text: str):
    """Add a new view to an accent in prompts.json."""
    try:
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)

        if "photo" not in existing:
            existing["photo"] = {}
        if accent not in existing["photo"] or not isinstance(existing["photo"][accent], dict):
            existing["photo"][accent] = {}

        existing["photo"][accent][view_key] = prompt_text

        if "_labels" not in existing["photo"][accent] or not isinstance(existing["photo"][accent]["_labels"], dict):
            existing["photo"][accent]["_labels"] = {}
        existing["photo"][accent]["_labels"][view_key] = label

        if "_order" not in existing["photo"][accent] or not isinstance(existing["photo"][accent]["_order"], list):
            existing["photo"][accent]["_order"] = []
        if view_key not in existing["photo"][accent]["_order"]:
            existing["photo"][accent]["_order"].append(view_key)

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to create photo view: {e}")


def _remove_view_from_json(json_path: Path, accent: str, view_key: str):
    """Remove a view from a single JSON file if it exists."""
    try:
        if not json_path.exists():
            return
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        accent_data = data.get("photo", {}).get(accent)
        if not isinstance(accent_data, dict):
            return
        changed = False
        if view_key in accent_data and not view_key.startswith("_"):
            accent_data.pop(view_key, None)
            changed = True
        labels = accent_data.get("_labels")
        if isinstance(labels, dict) and view_key in labels:
            labels.pop(view_key, None)
            changed = True
        order = accent_data.get("_order")
        if isinstance(order, list) and view_key in order:
            order.remove(view_key)
            changed = True
        if changed:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def delete_photo_view(accent: str, view_key: str):
    """Remove a view entirely from BOTH prompts.json and default_prompts.json."""
    _remove_view_from_json(_PROMPTS_JSON, accent, view_key)
    _remove_view_from_json(_DEFAULT_PROMPTS_JSON, accent, view_key)


def update_photo_view_order(accent: str, ordered_keys: list[str]):
    """Set custom view order for an accent."""
    try:
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)

        if "photo" not in existing:
            existing["photo"] = {}
        if accent not in existing["photo"] or not isinstance(existing["photo"][accent], dict):
            existing["photo"][accent] = {}

        existing["photo"][accent]["_order"] = ordered_keys

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to update view order: {e}")


def create_photo_accent(accent_key: str, label: str):
    """Create a new empty accent block in prompts.json."""
    try:
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)

        if "photo" not in existing:
            existing["photo"] = {}

        if accent_key in existing["photo"] and isinstance(existing["photo"][accent_key], dict):
            raise ValueError(f"Accent '{accent_key}' already exists")

        existing["photo"][accent_key] = {
            "_labels": {},
            "_order": [],
        }

        # Also update _accent_labels
        if "_accent_labels" not in existing["photo"] or not isinstance(existing["photo"]["_accent_labels"], dict):
            existing["photo"]["_accent_labels"] = {}
        existing["photo"]["_accent_labels"][accent_key] = label

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to create photo accent: {e}")


def delete_photo_accent(accent_key: str):
    """Remove an accent block entirely from both prompts.json and default_prompts.json."""
    for json_path in (_PROMPTS_JSON, _DEFAULT_PROMPTS_JSON):
        try:
            if not json_path.exists():
                continue
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            photo = data.get("photo", {})
            if accent_key in photo and isinstance(photo[accent_key], dict):
                del photo[accent_key]
            # Clean up _accent_labels
            accent_labels = photo.get("_accent_labels")
            if isinstance(accent_labels, dict) and accent_key in accent_labels:
                del accent_labels[accent_key]
            data["photo"] = photo
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            raise RuntimeError(f"Failed to delete photo accent: {e}")


def get_accent_labels() -> dict:
    """Get accent display labels from custom or default JSON."""
    custom = load_custom_photo_prompts()
    labels = custom.get("_accent_labels")
    if isinstance(labels, dict):
        return labels
    defaults = load_default_photo_prompts()
    labels = defaults.get("_accent_labels")
    if isinstance(labels, dict):
        return labels
    return {}


def update_gender_blocks(blocks: dict):
    """Update _gender_boy/_gender_girl/_gender_unisex blocks in prompts.json."""
    try:
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)

        if "photo" not in existing:
            existing["photo"] = {}

        for key in ("_gender_boy", "_gender_girl", "_gender_unisex"):
            if key in blocks:
                existing["photo"][key] = blocks[key]

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to update gender blocks: {e}")


def update_photo_view_label(accent: str, view_key: str, label: str):
    """Update the display label for a view."""
    try:
        existing = {}
        if _PROMPTS_JSON.exists():
            with open(_PROMPTS_JSON, "r", encoding="utf-8") as f:
                existing = json.load(f)

        if "photo" not in existing:
            existing["photo"] = {}
        if accent not in existing["photo"] or not isinstance(existing["photo"][accent], dict):
            existing["photo"][accent] = {}

        if "_labels" not in existing["photo"][accent] or not isinstance(existing["photo"][accent]["_labels"], dict):
            existing["photo"][accent]["_labels"] = {}
        existing["photo"][accent]["_labels"][view_key] = label

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_PROMPTS_JSON, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise RuntimeError(f"Failed to update view label: {e}")
