import os
import base64
import time
import json
import glob
import threading
from google import genai
from google.genai import types
from PIL import Image
import logging

from fastapi_app.services import prompt_service

_log = logging.getLogger(__name__)
_SLEEP_EVENT = threading.Event()

def _find_local_service_account() -> str | None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    candidates = glob.glob(os.path.join(root, "*.json"))
    for p in candidates:
        name = os.path.basename(p).lower()
        if "fleet-symbol" in name or "service" in name or "credentials" in name:
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and data.get("type") == "service_account":
                    return p
            except Exception:
                continue
    return None

def get_client(prefer: str = "auto"):
    b64_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_B64")
    if b64_creds and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            import tempfile
            _decoded = base64.b64decode(b64_creds)
            _tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
            _tmp.write(_decoded)
            _tmp.close()
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _tmp.name
            _log.info("Decoded GOOGLE_APPLICATION_CREDENTIALS_B64 to %s", _tmp.name)
        except Exception as e:
            _log.error("Failed to decode B64 credentials: %s", e)

    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or _find_local_service_account()
    project_number = os.getenv("GOOGLE_CLOUD_PROJECT_NUMBER")
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    if key_path and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path
    if key_path and not (project_number or project):
        try:
            with open(key_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            project = data.get("project_id") or project
        except Exception:
            pass
    location = os.getenv("GEMINI_LOCATION", "us-central1")
    api_key = os.getenv("GEMINI_API_KEY")
    prefer_vertex = os.getenv("GEMINI_PREFER_VERTEX", "0").lower() in ("1", "true", "yes")
    
    if prefer == "api" and api_key:
        return genai.Client(api_key=api_key)
    if prefer == "api":
        raise ValueError("GEMINI_API_KEY is required for api mode")
        
    client = None
    if prefer == "vertex" and (key_path and (project_number or project)):
        client = genai.Client(vertexai=True, project=project_number or project, location=location)
    elif api_key and not prefer_vertex:
        client = genai.Client(api_key=api_key)
    elif key_path and (project_number or project):
        client = genai.Client(vertexai=True, project=project_number or project, location=location)
    elif api_key:
        client = genai.Client(api_key=api_key)
        
    if client:
        return client
        
    debug_msg = f"key_path={bool(key_path)}, project={project}, api_key={bool(api_key)}, prefer_vertex={prefer_vertex}"
    _log.error("Missing Gemini credentials. Debug: %s", debug_msg)
    raise ValueError(f"Missing Google Cloud Project ID (GOOGLE_CLOUD_PROJECT) or Gemini API Key (GEMINI_API_KEY). Debug: {debug_msg}")

def get_exact_rgb(image_path: str) -> tuple:
    """Extracts color from the center of the image."""
    with Image.open(image_path) as img:
        img = img.convert('RGB')
        w, h = img.size
        pixel = img.crop((w*0.49, h*0.49, w*0.51, h*0.51)).resize((1, 1)).getpixel((0, 0))
        return pixel

def rgb_to_hex(rgb: tuple) -> str:
    return '#{:02X}{:02X}{:02X}'.format(*rgb)

def _generate_image(client: genai.Client, model: str, image_path: str, prompt: str) -> bytes:
    raw_input_img = Image.open(image_path)
    
    # Convert PNG to JPEG if needed - some models don't support PNG alpha
    if raw_input_img.mode in ('RGBA', 'P', 'LA'):
        raw_input_img = raw_input_img.convert('RGB')
    
    # Convert PIL Image to bytes for reliable SDK transmission
    import io
    img_buffer = io.BytesIO()
    raw_input_img.save(img_buffer, format='JPEG', quality=95)
    img_buffer.seek(0)
    img_bytes = img_buffer.read()
    
    cfg_kwargs = {"response_modalities": ["IMAGE"]}
    seed_env = os.getenv("GEMINI_RANDOM_SEED")
    if seed_env:
        try:
            cfg_kwargs["random_seed"] = int(seed_env)
        except Exception:
            pass
    try:
        if os.getenv("AI_GEMINI_LOG", "1").lower() in ("1", "true", "yes", "on"):
            try:
                w, h = raw_input_img.size
            except Exception:
                w, h = 0, 0
            payload_preview = {
                "model": model,
                "config": cfg_kwargs,
                "image_path": image_path,
                "image_size": [w, h],
                "prompt": prompt,
            }
            try:
                print("[AI][Gemini] request:", json.dumps(payload_preview, ensure_ascii=False), flush=True)
            except Exception:
                print("[AI][Gemini] request:", {"model": model, "config": cfg_kwargs, "image_path": image_path, "image_size": [w, h]}, flush=True)
    except Exception:
        pass
    try:
        config = types.GenerateContentConfig(**cfg_kwargs)
    except TypeError:
        config = types.GenerateContentConfig(response_modalities=["IMAGE"])
    
    # Pass image as inline_data Part for reliable SDK v1.x compatibility
    image_part = types.Part(
        inline_data=types.Blob(
            mime_type="image/jpeg",
            data=img_bytes,
        )
    )
    resp = client.models.generate_content(model=model, contents=[prompt, image_part], config=config)
    parts = getattr(resp.candidates[0].content, "parts", []) if resp.candidates else []
    for part in parts:
        data = getattr(part, "inline_data", None)
        if data is None:
            continue
        payload = data.data
        if isinstance(payload, str):
            payload = base64.b64decode(payload)
        if isinstance(payload, (bytes, bytearray)):
            return bytes(payload)
    raise Exception("no_image")

def generate_fashion_photo(image_path: str, prompt: str) -> bytes:
    model_primary = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-image")
    try:
        client = get_client()
        return _generate_image(client, model_primary, image_path, prompt)
    except Exception as e:
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg or "quota" in msg.lower():
            try:
                _SLEEP_EVENT.wait(0.8)
                if os.getenv("GEMINI_API_KEY"):
                    client_api = get_client(prefer="api")
                    return _generate_image(client_api, model_primary, image_path, prompt)
                client_vertex = get_client(prefer="vertex")
                return _generate_image(client_vertex, model_primary, image_path, prompt)
            except Exception as e2:
                raise e2
        raise e

def generate_seo_text(product_name: str, product_description: str, category: str) -> dict:
    client = get_client()
    model_name = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
    template = prompt_service.get_required_seo_prompt("generate_seo_text")
    prompt = prompt_service.render_prompt(
        template,
        product_name=product_name,
        product_description=product_description,
        category=category,
    )
    resp = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["TEXT"]),
    )
    text_out = ""
    try:
        parts = getattr(resp.candidates[0].content, "parts", []) if resp.candidates else []
        for p in parts:
            t = getattr(p, "text", None)
            if t:
                text_out += t
    except Exception:
        text_out = ""
    if not text_out:
        raise Exception("No text from Gemini")
    lines = [l.strip() for l in text_out.strip().splitlines() if l.strip()]
    uk = {"title": "", "description": "", "keywords": []}
    ru = {"title": "", "description": "", "keywords": []}
    for line in lines:
        low = line.lower()
        if low.startswith("uk title:"):
            uk["title"] = line.split(":", 1)[1].strip()
        elif low.startswith("uk description:"):
            uk["description"] = line.split(":", 1)[1].strip()
        elif low.startswith("uk keywords:"):
            kw = line.split(":", 1)[1].strip()
            uk["keywords"] = [k.strip() for k in kw.split(",") if k.strip()]
        elif low.startswith("ru title:"):
            ru["title"] = line.split(":", 1)[1].strip()
        elif low.startswith("ru description:"):
            ru["description"] = line.split(":", 1)[1].strip()
        elif low.startswith("ru keywords:"):
            kw = line.split(":", 1)[1].strip()
            ru["keywords"] = [k.strip() for k in kw.split(",") if k.strip()]
    if not uk["title"]:
        uk["title"] = product_name[:60]
    if not uk["description"]:
        uk["description"] = (product_description or product_name)[:160]
    if not uk["keywords"]:
        uk["keywords"] = [product_name][:5]
    if not ru["title"]:
        ru["title"] = product_name[:60]
    if not ru["description"]:
        ru["description"] = (product_description or product_name)[:160]
    if not ru["keywords"]:
        ru["keywords"] = [product_name][:5]
    return {"uk": uk, "ru": ru}

def generate_product_content(seed_text: str, category: str, audience: str, brand: str = "VINESENT") -> dict:
    client = get_client()
    model_name = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
    template = prompt_service.get_required_seo_prompt("generate_product_content")
    prompt = prompt_service.render_prompt(
        template,
        seed_text=seed_text or "",
        category=category or "дитячий одяг",
        audience=audience or "унісекс",
        brand=brand,
    )
    resp = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["TEXT"]),
    )
    text_out = ""
    try:
        parts = getattr(resp.candidates[0].content, "parts", []) if resp.candidates else []
        for p in parts:
            t = getattr(p, "text", None)
            if t:
                text_out += t
    except Exception:
        text_out = ""
    if not text_out:
        raise Exception("No text from Gemini")
    start = text_out.find("{")
    end = text_out.rfind("}")
    if start == -1 or end == -1:
        raise Exception("Invalid model output")
    payload = json.loads(text_out[start:end + 1])
    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()
    seo_title = str(payload.get("seoTitle") or "").strip()
    seo_description = str(payload.get("seoDescription") or "").strip()
    keywords_raw = payload.get("keywords") or []
    keywords = [str(k).strip() for k in keywords_raw if str(k).strip()][:5]
    if not name:
        name = seed_text.strip()[:70] or "Товар"
    if not description:
        description = seed_text.strip()[:240] or name
    if not seo_title:
        seo_title = f"{name[:45]} | {brand}"
    if not seo_description:
        seo_description = description[:160]
    if not keywords:
        keywords = [name]
    return {
        "name": name[:70],
        "description": description,
        "seoTitle": seo_title[:60],
        "seoDescription": seo_description[:160],
        "keywords": keywords[:8],
    }

def generate_sewing_measurements(product_name: str, product_description: str, category: str, gender: str, sizes: list[str]) -> dict:
    client = get_client()
    model_name = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
    sizes_norm = [str(s).strip() for s in (sizes or []) if str(s).strip()]
    template = prompt_service.get_required_seo_prompt("generate_sewing_measurements")
    prompt = prompt_service.render_prompt(
        template,
        product_name=product_name,
        product_description=product_description,
        category=category,
        gender=gender,
        sizes_json=json.dumps(sizes_norm, ensure_ascii=False),
    )
    resp = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["TEXT"]),
    )
    text_out = ""
    try:
        parts = getattr(resp.candidates[0].content, "parts", []) if resp.candidates else []
        for p in parts:
            t = getattr(p, "text", None)
            if t:
                text_out += t
    except Exception:
        text_out = ""
    if not text_out:
        raise Exception("No text from Gemini")
    start = text_out.find("{")
    end = text_out.rfind("}")
    if start == -1 or end == -1:
        raise Exception("Invalid model output")
    payload = json.loads(text_out[start:end + 1])
    if not isinstance(payload, dict):
        raise Exception("Invalid measurements json")
    out: dict[str, dict] = {}
    for k, v in payload.items():
        ks = str(k).strip()
        if not ks or not isinstance(v, dict):
            continue
        out[ks] = v
    return out

def fallback_product_content(seed_text: str, category: str, audience: str, brand: str = "VINESENT") -> dict:
    seed = " ".join((seed_text or "").strip().split())
    cat = (category or "дитячий одяг").strip()
    aud = (audience or "унісекс").strip()
    if not seed:
        seed = "базовий товар"
    name = f"{cat}: {seed}".strip()
    if len(name) > 70:
        name = name[:67].rstrip() + ""
    description = (
        f"{name} для {aud}. "
        f"Комфортна посадка, приємні матеріали та практичний крій для щоденного використання. "
        f"Підійде для сезону та стилю, що відповідає запиту: {seed}."
    )
    seo_title = f"{name[:44]} | {brand}".strip()
    seo_description = f"Купити {name.lower()} у {brand}. Швидка доставка по Україні, актуальні розміри та якість."
    keywords = [seed, cat, f"{cat} {aud}", f"купити {cat}", brand.lower()]
    return {
        "name": name,
        "description": description[:420],
        "seoTitle": seo_title[:60],
        "seoDescription": seo_description[:160],
        "keywords": [k[:40] for k in keywords][:5],
    }

def parse_product_autofill(input_text: str, brand: str = "VINESENT") -> dict:
    client = get_client()
    model_name = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
    template = prompt_service.get_required_seo_prompt("parse_product_autofill")
    prompt = prompt_service.render_prompt(
        template,
        input_text=input_text,
        brand=brand,
    )
    resp = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["TEXT"]),
    )
    text_out = ""
    try:
        parts = getattr(resp.candidates[0].content, "parts", []) if resp.candidates else []
        for p in parts:
            t = getattr(p, "text", None)
            if t:
                text_out += t
    except Exception:
        text_out = ""
    if not text_out:
        raise Exception("No text from Gemini")
    start = text_out.find("{")
    end = text_out.rfind("}")
    if start == -1 or end == -1:
        raise Exception("Invalid model output")
    payload = json.loads(text_out[start:end + 1])
    # Sanitize types
    def _num(x):
        try:
            return float(x)
        except Exception:
            return 0.0
    out = {
        "name": str(payload.get("name") or "").strip()[:70],
        "description": str(payload.get("description") or "").strip(),
        "seoTitle": str(payload.get("seoTitle") or "").strip()[:60],
        "seoDescription": str(payload.get("seoDescription") or "").strip()[:160],
        "keywords": [str(k).strip() for k in (payload.get("keywords") or []) if str(k).strip()][:5],
        "categorySlug": str(payload.get("categorySlug") or "").strip().lower(),
        "categoryName": str(payload.get("categoryName") or "").strip(),
        "price": _num(payload.get("price")),
        "salePrice": _num(payload.get("salePrice")),
        "stock": int(_num(payload.get("stock"))),
        "colors": [str(c).strip() for c in (payload.get("colors") or []) if str(c).strip()][:12],
        "sizes": [str(s).strip() for s in (payload.get("sizes") or []) if str(s).strip()][:20],
        "discountPercent": int(_num(payload.get("discountPercent"))),
        "audience": str(payload.get("audience") or "").strip().lower(),
    }
    if not out["seoTitle"]:
        out["seoTitle"] = f"{out['name'][:45]} | {brand}"
    if not out["seoDescription"]:
        out["seoDescription"] = (out["description"] or out["name"])[:160]
    if out["audience"] in ("вона", "female", "girl"):
        out["audience"] = "female"
    elif out["audience"] in ("він", "male", "boy"):
        out["audience"] = "male"
    else:
        out["audience"] = "unisex"
    return out
