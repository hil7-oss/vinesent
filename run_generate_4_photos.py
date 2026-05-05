import argparse
import json
import os
import time
from pathlib import Path

try:
    from ..services.gemini_service import generate_fashion_photo, get_exact_rgb, rgb_to_hex  # type: ignore
except Exception:
    try:
        from gemini_service import generate_fashion_photo, get_exact_rgb, rgb_to_hex  # type: ignore
    except Exception:
        generate_fashion_photo = None  # type: ignore
        get_exact_rgb = None  # type: ignore
        rgb_to_hex = None  # type: ignore

AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "2"))


def log(message: str):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] {message}", flush=True)


def hex_to_rgb_str(h: str) -> str:
    h = h.strip().lstrip("#")
    if len(h) != 6:
        return "R0 G0 B0"
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"R{r} G{g} B{b}"


def is_rate_limit_error(e: Exception) -> bool:
    msg = str(e)
    return any(k in msg for k in ("RESOURCE_EXHAUSTED", "429", "quota"))


def is_no_image_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "no_image" in msg


def configure_google_credentials():
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.getenv("GOOGLE_CLOUD_PROJECT"):
        return
    script_dir = Path(__file__).resolve().parent
    json_candidates = sorted(script_dir.glob("*.json"))
    for fp in json_candidates:
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict) or data.get("type") != "service_account":
            continue
        if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(fp)
        project_id = data.get("project_id")
        if project_id and not os.getenv("GOOGLE_CLOUD_PROJECT"):
            os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
        log(f"Найден сервисный JSON: {fp.name}")
        log(f"GOOGLE_CLOUD_PROJECT={os.getenv('GOOGLE_CLOUD_PROJECT', '')}")
        break


def generate_with_retry(image_path: str, prompt: str) -> bytes:
    if generate_fashion_photo is None:
        raise RuntimeError("gemini_service is not available for CLI run")
    last_error = None
    for attempt in range(1, AI_MAX_RETRIES + 1):
        try:
            log(f"Попытка {attempt}/{AI_MAX_RETRIES}: отправка запроса в Gemini")
            effective_prompt = prompt
            if attempt > 1:
                effective_prompt = (
                    f"{prompt}\n\n"
                    "Return exactly one generated image. "
                    "Do not return explanatory text."
                )
            return generate_fashion_photo(image_path, effective_prompt)
        except Exception as e:
            last_error = e
            log(f"Ошибка попытки {attempt}: {type(e).__name__}: {e}")
            if is_rate_limit_error(e) and attempt < AI_MAX_RETRIES:
                log("Rate limit, повторяем без задержки")
                continue
            if is_no_image_error(e) and attempt < AI_MAX_RETRIES:
                log("Модель вернула no_image, повторяем без задержки")
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("ai_generation_failed")


def build_prompts(rgb_str: str) -> list[str]:
    strict_vto_front = """{ 
   "mode": "STRICT_VIRTUAL_TRY_ON", 
   "task": "Place the clothing item from the uploaded reference image onto a realistic teenage model for an e-commerce product photo.", 
   "reference": "Use ONLY the clothing item from the uploaded image.", 
   "model": { 
     "age_range": "13-16", 
     "gender": "auto (boy or girl depending on the clothing style)", 
     "appearance": "realistic teenage fashion model with natural proportions", 
     "expression": "neutral", 
     "pose": "front-facing e-commerce fashion pose, shoulders square; arms relaxed", 
     "focus": "model must not distract attention from the clothing" 
   }, 
   "composition": { 
     "rule": "DO NOT show full body", 
     "framing": { 
       "tops": "chest to waist", 
       "bottoms": "waist to knees", 
       "dress": "torso to mid-thigh" 
     }, 
     "focus": "the clothing must occupy most of the frame" 
   }, 
   "clothing_rules": { 
     "identity": "The clothing must remain 100% identical to the reference image", 
     "color": "DO NOT change colors under any circumstances", 
     "design": "DO NOT redesign or reinterpret the garment", 
     "details": [ 
       "preserve logos", 
       "preserve patterns", 
       "preserve stitching", 
       "preserve embroidery", 
       "preserve prints", 
       "preserve seams", 
       "preserve texture" 
     ] 
   }, 
   "realism": { 
     "fabric_physics": "ultra realistic", 
     "draping": "natural", 
     "wrinkles": "accurate according to garment type", 
     "shadows": "realistic contact shadows" 
   }, 
   "style": { 
     "photo_type": "high-end e-commerce fashion photography", 
     "lighting": "soft studio lighting", 
     "background": "neutral studio background (white or light gray)", 
     "focus": "ultra sharp product focus" 
   }, 
   "quality": { 
     "render": "photorealistic", 
     "texture_detail": "very high", 
     "fabric_detail": "visible material structure", 
     "stitching_detail": "clearly visible", 
     "catalog_quality": true 
   }, 
   "restrictions": [ 
     "no color shift", 
     "no design modification", 
     "no additional graphics", 
     "no new clothing elements", 
     "do not change the garment structure" 
   ], 
   "result": "A realistic teenage model wearing the exact clothing item from the reference image, with full visual focus on the garment, suitable for an online clothing store product photo." 
 }"""
    strict_vto_side = """{ 
   "mode": "STRICT_VIRTUAL_TRY_ON", 
   "task": "Place the clothing item from the uploaded reference image onto a realistic teenage model for an e-commerce product photo.", 
   "reference": "Use ONLY the clothing item from the uploaded image.", 
   "model": { 
     "age_range": "13-16", 
     "gender": "auto (boy or girl depending on the clothing style)", 
     "appearance": "realistic teenage fashion model with natural proportions", 
     "expression": "neutral", 
     "pose": "three-quarter side view (30–45°) e-commerce pose, same model identity as the first output", 
     "focus": "model must not distract attention from the clothing", 
     "identity_consistency": "Use EXACTLY the same teenage model identity as in the first photo (same face, hair length, skin tone)." 
   }, 
   "composition": { 
     "rule": "DO NOT show full body", 
     "framing": { 
       "tops": "chest to waist", 
       "bottoms": "waist to knees", 
       "dress": "torso to mid-thigh" 
     }, 
     "focus": "the clothing must occupy most of the frame" 
   }, 
   "clothing_rules": { 
     "identity": "The clothing must remain 100% identical to the reference image", 
     "color": "DO NOT change colors under any circumstances", 
     "design": "DO NOT redesign or reinterpret the garment", 
     "details": [ 
       "preserve logos", 
       "preserve patterns", 
       "preserve stitching", 
       "preserve embroidery", 
       "preserve prints", 
       "preserve seams", 
       "preserve texture" 
     ] 
   }, 
   "realism": { 
     "fabric_physics": "ultra realistic", 
     "draping": "natural", 
     "wrinkles": "accurate according to garment type", 
     "shadows": "realistic contact shadows" 
   }, 
   "style": { 
     "photo_type": "high-end e-commerce fashion photography", 
     "lighting": "soft studio lighting", 
     "background": "neutral studio background (white or light gray)", 
     "focus": "ultra sharp product focus" 
   }, 
   "quality": { 
     "render": "photorealistic", 
     "texture_detail": "very high", 
     "fabric_detail": "visible material structure", 
     "stitching_detail": "clearly visible", 
     "catalog_quality": true 
   }, 
   "restrictions": [ 
     "no color shift", 
     "no design modification", 
     "no additional graphics", 
     "no new clothing elements", 
     "do not change the garment structure" 
   ], 
   "result": "A realistic teenage model wearing the exact clothing item from the reference image, with full visual focus on the garment, suitable for an online clothing store product photo." 
 }"""
    ghost_man = """{
  "mode": "STRICT_GHOST_MANNEQUIN",
  "task": "Create a 3D inflated ghost mannequin rendering of the clothing item from the uploaded image.",
  "reference": "Use ONLY the clothing item from the uploaded image.",
  "rendering": {
    "look": "natural filled volume as if worn on an invisible mannequin",
    "body": "no body, no head, no hands, no legs, no mannequin parts",
    "background": "neutral studio background (white or light gray)",
    "lighting": "soft studio lighting"
  },
  "clothing_rules": {
    "identity": "The clothing must remain 100% identical to the reference image",
    "color": "DO NOT change colors under any circumstances",
    "design": "DO NOT redesign or reinterpret the garment",
    "details": [
      "preserve logos",
      "preserve patterns",
      "preserve stitching",
      "preserve embroidery",
      "preserve prints",
      "preserve seams",
      "preserve texture"
    ]
  },
  "quality": {
    "render": \"photorealistic\",
    "catalog_quality": true
  },
  "result": "Ghost mannequin product view with realistic volume and no human or mannequin visible."
}"""
    folded = """{
  "mode": "STRICT_FOLDED_PRODUCT",
  "task": "Create a clean catalog photo of the same clothing item folded neatly like a real product shot.",
  "reference": "Use ONLY the clothing item from the uploaded image.",
  "composition": {
    "layout": "single folded garment centered on canvas",
    "background": "pure white or light gray studio background",
    "framing": "ample margins, clothing fully visible"
  },
  "clothing_rules": {
    "identity": "The clothing must remain 100% identical to the reference image",
    "color": "DO NOT change colors under any circumstances",
    "design": "DO NOT redesign or reinterpret the garment",
    "details": [
      "preserve logos",
      "preserve prints",
      "preserve seams and texture"
    ]
  },
  "style": {
    "photo_type": "e-commerce catalog folded product",
    "lighting": "soft studio lighting",
    "focus": "ultra sharp product focus"
  },
  "quality": {
    "render": \"photorealistic\",
    "catalog_quality": true
  },
  "result": "A folded clothing image suitable for online store product listing, matching the reference item exactly."
}"""
    return [strict_vto_front, strict_vto_side, ghost_man, folded]


def main():
    if generate_fashion_photo is None or get_exact_rgb is None or rgb_to_hex is None:
        raise RuntimeError("gemini_service is not available for CLI run")
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--image",
        default=str(Path(__file__).with_name("photo_2026-03-05_21-07-34.jpg")),
        help="Путь к исходной фотографии",
    )
    parser.add_argument(
        "--out-dir",
        default=str(Path(__file__).with_name("generated_photos")),
        help="Папка для результатов",
    )
    parser.add_argument(
        "--color-hex",
        default="auto",
        help="HEX цвет (#RRGGBB) или auto",
    )
    args = parser.parse_args()
    configure_google_credentials()

    image_path = os.path.abspath(args.image)
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Файл не найден: {image_path}")

    if args.color_hex.lower() == "auto":
        try:
            rgb = get_exact_rgb(image_path)
            color_hex = rgb_to_hex(rgb)
        except Exception:
            color_hex = "#000000"
    else:
        color_hex = args.color_hex

    rgb_str = hex_to_rgb_str(color_hex)
    prompts = build_prompts(rgb_str)

    log(f"Источник: {image_path}")
    log(f"Цвет: {color_hex} ({rgb_str})")
    log(f"Генерируем {len(prompts)} изображения")

    for idx, prompt in enumerate(prompts, start=1):
        log(f"[{idx}/{len(prompts)}] генерация начата")
        log(f"[{idx}/{len(prompts)}] промпт: {prompt}")
        data = generate_with_retry(image_path, prompt)
        output_file = out_dir / f"generated_{idx}.png"
        output_file.write_bytes(data)
        log(f"[{idx}/{len(prompts)}] сохранено: {output_file}")

    log("Готово")


if __name__ == "__main__":
    main()
