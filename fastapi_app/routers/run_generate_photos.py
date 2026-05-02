"""
AI photo generation prompts for e-commerce clothing — ACCENT-BASED system.

Accent types:
- TOP: upper clothing (shirts, t-shirts, jackets, hoodies) — focus on top, proper angles
- BOTTOM: lower clothing (pants, jeans, shorts, skirts) — focus on bottom, proper angles
- ACCESSORIES: depends on accessory type (hats, bags, belts, etc.)
- SET: full outfit/look — complete set with top + bottom styled together

Each accent generates 6-8 photos with correct poses/angles for that category.
"""
import os


# ---------------------------------------------------------------------------
# Category → accent detection
# ---------------------------------------------------------------------------

def _detect_accent(category: str) -> str:
    """Detect accent type from category name."""
    cat = category.lower().strip()

    tops = {"shirt", "tshirt", "t-shirt", "tee", "polo", "jacket", "hoodie", "sweater",
            "sweatshirt", "vest", "coat", "blazer", "cardigan", "pullover", "top", "blouse",
            "dress", "рубаш", "футбол", "курт", "худі", "светр", "толстов", "жилет", "пальто",
            "плать", "сукн", "кофт", "лонгслив"}
    bottoms = {"pants", "trousers", "jeans", "shorts", "skirt", "leggings", "joggers",
               "cargo", "chinos", "bottom", "штаны", "брюки", "джинс", "шорты", "юбк",
               "легін", "спортивн штаны", "карго"}
    accessories = {"hat", "cap", "beanie", "bag", "backpack", "belt", "scarf", "gloves",
                   "socks", "tie", "bow", "accessory", "шапк", "кепк", "сумк", "рюкзак",
                   "ремн", "шарф", "перчат", "носк", "галстук", "аксес"}

    if any(t in cat for t in tops):
        return "top"
    if any(b in cat for b in bottoms):
        return "bottom"
    if any(a in cat for a in accessories):
        return "accessory"
    return "top"  # default


# ---------------------------------------------------------------------------
# Gender
# ---------------------------------------------------------------------------

_BOY = "The model is a BOY (male teenager). Male body shape, male facial features, masculine appearance. Age 13-16."
_GIRL = "The model is a GIRL (female teenager). Female body shape, female facial features, feminine appearance. Age 13-16."
_UNISEX = "The model is a teenager (13-16) matching the clothing style."

def _gender(g: str) -> str:
    g = g.lower().strip()
    if g in ("male", "boy", "він", "хлопчик"):
        return _BOY
    if g in ("female", "girl", "вона", "дівчинка"):
        return _GIRL
    return _UNISEX


# ---------------------------------------------------------------------------
# Universal strict rules — MAX DETAIL + SELF-VERIFICATION
# ---------------------------------------------------------------------------

_STRICT = """
MAXIMUM DETAIL — EXACT REPRODUCTION — SELF-VERIFICATION REQUIRED:

1. STUDY REFERENCE: Before generating, carefully examine EVERY pixel of the reference image — color, fabric texture, seams, stitching, collar, sleeves, pockets, buttons, zippers, prints, logos, text, panels, hem style.

2. EXACT MATCH: The generated image must show the IDENTICAL item — same color (no shifts, no tinting, no brightness change), same design, same proportions, same fabric look.

3. NO INVENTION: Do NOT add anything that does not exist in the reference. No extra pockets, no extra buttons, no extra patterns, no extra text.

4. NO OMISSION: Do NOT skip anything that IS in the reference. If there's a zipper — show it. If there's a print — reproduce it exactly. If there are seams — show them.

5. VERIFY BEFORE OUTPUT: Before generating, mentally verify:
   - Is the color EXACTLY the same as the reference?
   - Is the design EXACTLY the same (no added/missing elements)?
   - Are the proportions correct (not stretched, not squished)?
   - Is the fabric texture consistent with the reference?
   - Are all details (buttons, zippers, prints, logos) accurately reproduced?
   If ANY answer is NO — regenerate until ALL are YES.

6. E-COMMERCE QUALITY: Professional catalog photo, clean neutral studio background (white or very light gray), even lighting, sharp focus, high detail.

7. NO CROPPING: The entire clothing item must be fully visible — no part cut off.
"""


# ---------------------------------------------------------------------------
# TOP accent — 6 photos: front, back, 3/4, full-body, detail, casual
# ---------------------------------------------------------------------------

def _top_prompts(gender: str, category: str, color_hex: str) -> list[dict]:
    gen = _gender(gender)
    item = category or "top"

    prompts = [
        {
            "view": "front",
            "label": "Спереду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

FRONT VIEW — Model standing straight, facing camera, shoulders square, arms relaxed at sides.

Wearing the EXACT same {item} from the reference image.

Framing: Upper body from head to mid-hip. The ENTIRE garment visible from collar to bottom hem, both sleeves fully shown.

{_STRICT}

For this {item}:
- Entire garment from collar/neckline to bottom hem fully visible
- Both sleeves fully shown to their ends
- Front design (prints, text, logos, buttons, zippers, pockets) IDENTICAL to reference
- Collar/neckline construction matches reference exactly
- Natural fabric drape
- Same color — zero shifts

Result: Professional front-view e-commerce photo of the EXACT same {item} from reference."""
        },
        {
            "view": "back",
            "label": "Ззаду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. Study the front design to infer what the back looks like.

{gen}

BACK VIEW — Model standing with back to camera, showing the back of the SAME {item}.

Head turned slightly to side (showing profile), natural upright stance.

Framing: Upper body from behind, head to mid-hip. ENTIRE BACK of the garment visible.

{_STRICT}

For back view:
- Complete back of the garment visible
- Back design CONSISTENT with front shown in reference — same color, same fabric, same style
- Back collar/neckline visible
- If the front has a hood, show back of hood
- Back pockets if applicable
- Same color as reference

Result: Professional back-view photo of the EXACT same {item} from reference."""
        },
        {
            "view": "3/4",
            "label": "3/4 ракурс",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

THREE-QUARTER VIEW — Model at 30-45 degrees to camera, one foot slightly forward.

Wearing the EXACT same {item} from the reference image.

Framing: Upper body from 3/4 angle, head to mid-hip. Entire garment visible from this perspective.

{_STRICT}

For 3/4 view:
- Shows how the garment fits from the side angle — silhouette, drape, sleeve length
- Side seam visible
- How fabric hangs naturally from this angle
- Shoulder slope and armhole from side angle
- Same color, same fabric, same details as reference

Result: Professional 3/4 angle e-commerce photo of the EXACT same {item} from reference."""
        },
        {
            "view": "full_body",
            "label": "Повний ріст",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

FULL BODY FRONT VIEW — Model shown from HEAD to TOES, wearing the EXACT same {item}.

Pose: Standing straight, natural confident stance, hands at sides or one hand slightly in pocket.

Framing: FULL BODY — entire model from head to toes visible. NO cropping of head, feet, or any body part.

{_STRICT}

For full body:
- The {item} is the PRIMARY FOCUS — sharp, detailed, clearly visible
- Model wears simple neutral pants (dark jeans or black trousers) — NOT the focus
- The {item} occupies the visual center of attention
- Same color, same fabric, same details as reference

Result: Professional full-body fashion photo (head to toe) showing the EXACT same {item} from reference as the primary focus."""
        },
        {
            "view": "detail",
            "label": "Деталі",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. Examine the fabric texture, stitching, collar construction, any prints/logos, buttons, zippers — every small detail.

{gen}

CLOSE-UP DETAIL VIEW — Focused on the upper portion and key details of the EXACT same {item}.

Pose: Natural pose showing upper chest/collar/shoulder area, slight angle to highlight details.

Framing: Close-up on collar, neckline, chest area, shoulder region.

{_STRICT}

For detail view:
- Fabric texture and weave clearly visible
- Stitching quality and seams clearly visible
- Collar/neckline construction detail
- Any prints, logos, text, or embroidery sharp and readable
- Buttons, zippers, snaps if present — realistic and detailed
- Same color, same material as reference

Result: Professional close-up detail photo showing fabric, stitching, and design details of the EXACT same {item} from reference."""
        },
        {
            "view": "casual",
            "label": "Повсякденний образ",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

CASUAL POSE — Natural relaxed stance wearing the EXACT same {item}.

Pose: Slight body lean, relaxed shoulders, one hand maybe touching collar or in pocket, head tilted slightly, natural comfortable stance.

Framing: Upper body to mid-hip, entire {item} visible including hemline.

{_STRICT}

For casual pose:
- Shows how the garment looks in a natural, relaxed pose
- Natural fabric drape and movement
- How the {item} moves with the body in a casual stance
- Entire top must still be visible
- Same color, same design, same details as reference

Result: Casual lifestyle photo of the EXACT same {item} from reference in a relaxed pose."""
        },
    ]
    return prompts


# ---------------------------------------------------------------------------
# BOTTOM accent — 6 photos: front full, back full, 3/4, detail, walking, casual
# ---------------------------------------------------------------------------

def _bottom_prompts(gender: str, category: str, color_hex: str) -> list[dict]:
    gen = _gender(gender)
    item = category or "pants"

    prompts = [
        {
            "view": "front",
            "label": "Спереду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

FRONT FULL BODY VIEW — Model facing camera, standing straight, feet shoulder-width apart.

Wearing the EXACT same {item} from the reference image.

Framing: FULL BODY — head to TOES visible. The {item} MUST be shown from WAISTBAND all the way down to BOTTOM HEM/ANKLES.

{_STRICT}

CRITICAL FOR BOTTOMS — NO EXCEPTIONS:
- FULL LENGTH VISIBLE: Every inch from waistband to hem must be in frame
- NO CROPPING: Do NOT cut off the bottom of legs, hem, or feet/shoes
- ACCURATE WIDTH: Show EXACT width as in reference — if slim fit, show slim. If wide-leg, show wide-leg. If baggy, show baggy. Do NOT change the fit.
- LEG SHAPE: Leg shape, taper, and fit match reference exactly
- WAISTBAND: Visible (button, zipper, drawstring, elastic — as shown in reference)
- POCKETS: Front and back pockets in correct positions
- HEM: Bottom hem visible and shown accurately (cuffed, straight, tapered, elastic — as in reference)
- Same color as reference — no shifts

Result: Professional front-view full-body photo of the EXACT same {item} from reference, complete from waistband to hem."""
        },
        {
            "view": "back",
            "label": "Ззаду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. Study the front design to infer what the back looks like.

{gen}

BACK FULL BODY VIEW — Model standing with back to camera.

Framing: FULL BODY — head to toes visible. The {item} shown from WAISTBAND to BOTTOM HEM.

{_STRICT}

For back view:
- Complete back of the {item} visible — full length
- Back pockets in correct positions and style as shown in reference
- Waistband from behind visible
- Hem visible and shown accurately
- Same color, same fabric, same width as reference

Result: Professional back-view full-body photo of the EXACT same {item} from reference."""
        },
        {
            "view": "3/4",
            "label": "3/4 ракурс",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

THREE-QUARTER FULL BODY VIEW — Model at 30-45 degrees to camera, one foot slightly forward.

Wearing the EXACT same {item} from the reference image.

Framing: FULL BODY — head to toes visible. Entire {item} from waistband to hem visible from 3/4 angle.

{_STRICT}

For 3/4 view:
- Shows silhouette and fit from side angle
- How the fabric drapes from this perspective
- Leg shape and taper visible from 3/4
- Accurate width — do NOT change fit
- Same color, same details as reference

Result: Professional 3/4 angle full-body photo of the EXACT same {item} from reference."""
        },
        {
            "view": "detail",
            "label": "Деталі",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. Examine fabric texture, stitching, waistband construction, pockets, any prints/logos, seams — every detail.

{gen}

CLOSE-UP DETAIL VIEW — Focused on waistband, pockets, and fabric of the EXACT same {item}.

Framing: Close-up on waist/hip area showing waistband, pockets, upper leg region.

{_STRICT}

For detail view:
- Fabric texture and weave clearly visible
- Stitching quality and seams visible
- Waistband construction (button, zipper, drawstring, elastic) detailed
- Pockets shown in detail — placement, style, construction
- Any prints, logos, text sharp and readable
- Same color, same material as reference

Result: Professional close-up detail photo of the EXACT same {item} from reference."""
        },
        {
            "view": "walking",
            "label": "Крок",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

WALKING POSE — Model walking forward naturally, one leg stepping ahead.

Wearing the EXACT same {item} from the reference image.

Framing: FULL BODY — head to toes visible. Entire {item} visible showing how it moves during walking.

{_STRICT}

For walking pose:
- Shows how the {item} moves and drapes during natural walking
- Fabric movement and folds visible
- Full length visible — waistband to hem
- Accurate width — do NOT change fit
- Same color, same design as reference

Result: Professional walking pose photo of the EXACT same {item} from reference, showing movement."""
        },
        {
            "view": "casual",
            "label": "Повсякденний образ",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}.

{gen}

CASUAL POSE — Natural relaxed stance, slight lean, hands in pockets or one hand in pocket.

Wearing the EXACT same {item} from the reference image.

Framing: FULL BODY — head to toes visible. Entire {item} visible.

{_STRICT}

For casual pose:
- Shows how the {item} looks in a natural relaxed pose
- How the pants sit on the body in a casual stance
- Natural fabric drape
- Full length visible — waistband to hem
- Same color, same design as reference

Result: Casual photo of the EXACT same {item} from reference in a relaxed pose."""
        },
    ]
    return prompts


# ---------------------------------------------------------------------------
# ACCESSORY accent — 6 photos: front, detail, in-use, side, lifestyle, styled
# ---------------------------------------------------------------------------

def _accessory_prompts(gender: str, category: str, color_hex: str) -> list[dict]:
    gen = _gender(gender)
    item = category or "accessory"

    prompts = [
        {
            "view": "front",
            "label": "Спереду",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}.

{gen}

FRONT VIEW — Model wearing or holding the EXACT same {item} from reference.

Pose appropriate for this type of accessory.

Framing: The {item} must be the CENTER OF ATTENTION — fully visible, sharp, detailed.

{_STRICT}

For this accessory:
- {item} is the PRIMARY FOCUS
- All details of the {item} clearly visible
- Same color, same design, same materials as reference
- Professional e-commerce quality

Result: Professional front-view photo of the EXACT same {item} from reference."""
        },
        {
            "view": "detail",
            "label": "Деталі",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}. Examine every detail — material, texture, stitching, clasps, zippers, prints, logos, hardware.

CLOSE-UP DETAIL VIEW — Focused on the EXACT same {item}.

Framing: Close-up showing material, texture, construction details, any hardware or fastenings.

{_STRICT}

For detail view:
- Material and texture clearly visible
- Stitching, seams, construction quality visible
- Any hardware (clasps, zippers, buckles, snaps) detailed
- Any prints, logos, text sharp and readable
- Same color, same materials as reference

Result: Professional close-up detail photo of the EXACT same {item} from reference."""
        },
        {
            "view": "in_use",
            "label": "У використанні",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}.

{gen}

IN-USE VIEW — Model using/wearing the EXACT same {item} in a natural way.

Show the {item} as it would be used in real life — worn on body, held in hand, etc.

Framing: The {item} clearly visible in context of use.

{_STRICT}

For in-use view:
- Shows how the {item} looks when actually being used
- Natural pose appropriate for this type of accessory
- {item} is the primary focus
- Same color, same design as reference

Result: Professional in-use photo of the EXACT same {item} from reference."""
        },
        {
            "view": "side",
            "label": "Збоку",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}.

{gen}

SIDE VIEW — Model at 30-45 degrees to camera, showing the EXACT same {item} from a side angle.

Framing: The {item} fully visible from the side perspective.

{_STRICT}

For side view:
- Shows profile/side silhouette of the {item}
- How it looks from a different angle
- Same color, same design as reference

Result: Professional side-view photo of the EXACT same {item} from reference."""
        },
        {
            "view": "lifestyle",
            "label": "Lifestyle",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}.

{gen}

LIFESTYLE VIEW — Natural everyday scene with the EXACT same {item}.

Casual, lifestyle context — not studio. Natural lighting, relaxed pose.

Framing: {item} clearly visible, primary focus.

{_STRICT}

For lifestyle:
- Natural everyday context
- {item} is the primary focus
- Same color, same design as reference

Result: Lifestyle photo of the EXACT same {item} from reference."""
        },
        {
            "view": "styled",
            "label": "Стилізований",
            "prompt": f"""Reference image shows a real accessory product: {item}, color {color_hex}.

{gen}

STYLED VIEW — The EXACT same {item} styled as a fashion accessory in a composed shot.

Clean, styled composition — could be on a surface, hanging, or worn.

Framing: {item} centered, fully visible, sharp focus.

{_STRICT}

For styled view:
- Clean, composed presentation
- {item} is the sole focus
- Same color, same design as reference

Result: Styled fashion photo of the EXACT same {item} from reference."""
        },
    ]
    return prompts


# ---------------------------------------------------------------------------
# SET accent — 8 photos: full front, full back, 3/4 full, detail top, detail bottom, full casual, walking, lifestyle
# ---------------------------------------------------------------------------

def _set_prompts(gender: str, category: str, color_hex: str) -> list[dict]:
    gen = _gender(gender)
    item = category or "outfit"

    prompts = [
        {
            "view": "full_front",
            "label": "Повний спереду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT — top and bottom styled together.

{gen}

FULL BODY FRONT VIEW — Model facing camera, standing straight, showing the COMPLETE OUTFIT.

Pose: Standing straight, shoulders square, arms relaxed at sides, natural upright stance.

Framing: FULL BODY — head to TOES visible. The ENTIRE outfit visible from head to feet.

{_STRICT}

For set/outfit:
- COMPLETE outfit visible — top AND bottom both fully shown
- Both garments must be the EXACT same as in the reference
- Color accuracy for BOTH top and bottom
- How the top and bottom look together as a complete look
- Top details and bottom details both clearly visible
- Professional e-commerce quality

Result: Professional full-body front-view photo of the COMPLETE OUTFIT from reference."""
        },
        {
            "view": "full_back",
            "label": "Повний ззаду",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT.

{gen}

FULL BODY BACK VIEW — Model with back to camera, showing the COMPLETE OUTFIT from behind.

Head turned slightly to side (profile), natural upright stance.

Framing: FULL BODY — head to toes visible. ENTIRE back of outfit visible.

{_STRICT}

For full back:
- Complete back of both top and bottom visible
- Back design of both garments consistent with reference
- Full length of bottom visible — waistband to hem
- Back of top fully visible
- Same color, same design as reference

Result: Professional full-body back-view photo of the COMPLETE OUTFIT from reference."""
        },
        {
            "view": "full_3/4",
            "label": "Повний 3/4",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT.

{gen}

FULL BODY 3/4 VIEW — Model at 30-45 degrees to camera, one foot slightly forward.

Wearing the COMPLETE OUTFIT from the reference image.

Framing: FULL BODY — head to toes visible. Entire outfit from 3/4 angle.

{_STRICT}

For 3/4 full body:
- Shows the complete outfit silhouette from side angle
- How top and bottom look together from 3/4 perspective
- Both garments fully visible
- Same color, same design as reference

Result: Professional full-body 3/4 angle photo of the COMPLETE OUTFIT from reference."""
        },
        {
            "view": "detail_top",
            "label": "Деталі верх",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT. Focus on the TOP portion.

{gen}

CLOSE-UP DETAIL — Upper body, focused on the TOP part of the outfit.

Framing: Close-up on collar, neckline, chest area of the top garment.

{_STRICT}

For top detail:
- Fabric texture and stitching of the top clearly visible
- Collar/neckline construction detailed
- Any prints, logos, buttons, zippers on the top sharp and readable
- Same color, same material as reference
- Top is the sole focus

Result: Professional close-up detail photo of the TOP from the OUTFIT in reference."""
        },
        {
            "view": "detail_bottom",
            "label": "Деталі низ",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT. Focus on the BOTTOM portion.

{gen}

CLOSE-UP DETAIL — Lower body, focused on the BOTTOM part of the outfit.

Framing: Close-up on waistband, pockets, upper leg of the bottom garment.

{_STRICT}

For bottom detail:
- Fabric texture and stitching of the bottom clearly visible
- Waistband construction detailed (button, zipper, drawstring, elastic)
- Pockets shown in detail
- Any prints, logos, seams sharp and readable
- Same color, same material as reference
- Bottom is the sole focus

Result: Professional close-up detail photo of the BOTTOM from the OUTFIT in reference."""
        },
        {
            "view": "full_casual",
            "label": "Повсякденний повний",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT.

{gen}

CASUAL FULL BODY — Natural relaxed pose showing the COMPLETE OUTFIT.

Pose: Slight lean, relaxed shoulders, hands in pockets or at sides, natural comfortable stance.

Framing: FULL BODY — head to toes visible. Entire outfit visible.

{_STRICT}

For casual full body:
- Shows how the complete outfit looks in a relaxed pose
- How top and bottom work together naturally
- Both garments fully visible
- Same color, same design as reference

Result: Casual full-body photo of the COMPLETE OUTFIT from reference."""
        },
        {
            "view": "walking",
            "label": "Крок",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT.

{gen}

WALKING POSE — Model walking forward naturally, showing the COMPLETE OUTFIT in motion.

Framing: FULL BODY — head to toes visible. Entire outfit visible showing movement.

{_STRICT}

For walking:
- Shows how the complete outfit moves during natural walking
- Fabric movement and drape of both garments
- How top and bottom work together in motion
- Same color, same design as reference

Result: Professional walking photo of the COMPLETE OUTFIT from reference."""
        },
        {
            "view": "lifestyle",
            "label": "Lifestyle",
            "prompt": f"""Reference image shows a real clothing product: {item}, color {color_hex}. This is a SET/OUTFIT — a complete look.

{gen}

LIFESTYLE VIEW — Natural everyday scene with the COMPLETE OUTFIT.

Casual lifestyle context, natural lighting, relaxed pose.

Framing: Complete outfit clearly visible, primary focus.

{_STRICT}

For lifestyle:
- Natural everyday context
- Complete outfit is the focus
- How the top and bottom look together in a real-life setting
- Same color, same design as reference

Result: Lifestyle photo of the COMPLETE OUTFIT from reference."""
        },
    ]
    return prompts


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def build_prompts_for_product(
    category: str = "clothing",
    gender: str = "unisex",
    color_hex: str = "#000000",
    color_name: str = "colorful",
    image_type: str = "top",
    count: int = None,
) -> list[dict]:
    """
    Build prompts for AI photo generation.

    Args:
        category: Product category (shirt, pants, hat, etc.)
        gender: male/female/unisex
        color_hex: Hex color code
        color_name: Color name
        image_type: ACCENT type — "top", "bottom", "accessory", "set"
        count: Override number of photos to generate

    Returns:
        List of dicts with keys: view, label, prompt
    """
    accent = image_type if image_type in ("top", "bottom", "accessory", "set") else _detect_accent(category)

    if accent == "top":
        prompts = _top_prompts(gender, category, color_hex)
    elif accent == "bottom":
        prompts = _bottom_prompts(gender, category, color_hex)
    elif accent == "accessory":
        prompts = _accessory_prompts(gender, category, color_hex)
    elif accent == "set":
        prompts = _set_prompts(gender, category, color_hex)
    else:
        prompts = _top_prompts(gender, category, color_hex)

    if count is not None:
        prompts = prompts[:count]

    return prompts


def build_prompts(rgb_str: str) -> list[str]:
    """Legacy function."""
    prompts_data = build_prompts_for_product(
        category="clothing",
        gender="unisex",
        color_hex=rgb_str,
    )
    return [p["prompt"] for p in prompts_data]
