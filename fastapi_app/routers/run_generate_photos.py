"""
AI photo generation prompts for e-commerce clothing.
Categories: tops (shirts, t-shirts, jackets, hoodies), bottoms (pants, skirts, shorts),
accessories (hats, bags, belts).

Generates 6-8 photos per product: front, back, side, full-body, detail, poses.
"""
import os


# ---------------------------------------------------------------------------
# Block type detection
# ---------------------------------------------------------------------------

def _detect_block_type(category: str) -> str:
    """Detect if a category is tops, bottoms, or accessories."""
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

    cat = category.lower().strip()
    if any(t in cat for t in tops):
        return "tops"
    if any(b in cat for b in bottoms):
        return "bottoms"
    if any(a in cat for a in accessories):
        return "accessories"
    return "tops"  # default


# ---------------------------------------------------------------------------
# Gender descriptions - placed FIRST for maximum emphasis
# ---------------------------------------------------------------------------

_BOY_ONLY = """CRITICAL: The model MUST be a BOY (male teenager). NEVER a girl. 
Male body shape, male facial features, short or medium boy hairstyle, masculine appearance.
Age 13-16 years old, adolescent male."""

_GIRL_ONLY = """CRITICAL: The model MUST be a GIRL (female teenager). NEVER a boy.
Female body shape, female facial features, girl hairstyle, feminine appearance.
Age 13-16 years old, adolescent female."""

_UNISEX = """The model should be a teenager (13-16) matching the clothing style.
Choose boy or girl based on the clothing style and be consistent across all photos."""


def _gender_text(gender: str) -> str:
    g = gender.lower().strip()
    if g in ("male", "boy", "he", "him", "він", "хлопчик"):
        return _BOY_ONLY
    if g in ("female", "girl", "she", "her", "вона", "дівчинка"):
        return _GIRL_ONLY
    return _UNISEX


# ---------------------------------------------------------------------------
# Universal strict rules (applied to ALL prompts)
# ---------------------------------------------------------------------------

_STRICT_RULES = """
ABSOLUTE FAITHFUL REPRODUCTION - THIS IS A REAL PRODUCT, NOT CREATIVE GENERATION:
- Study the reference image meticulously before generating - examine EVERY detail
- EXACT colors: Match the reference pixel-by-pixel. No color shifts, no tinting, no brightness changes
- EXACT design: Every seam, stitch, panel, pocket, zipper, button must be IDENTICAL to the reference
- NO invented details: Do NOT add ANY element that does not exist in the reference image
- NO missing details: Do NOT omit ANY element that IS in the reference image
- EXACT proportions: Same width, length, sleeve length, collar shape - nothing stretched or squished
- EXACT fabric look: Same texture, thickness, drape as shown in the reference
- If there are prints/logos/text on the garment - reproduce them EXACTLY as they appear
- The output must look like the SAME PHYSICAL ITEM photographed from a different angle
- This is an e-commerce catalog photo - professional, clean, accurate
- Background: clean neutral white or very light gray studio background
"""

_NO_CROP = """
CRITICAL FRAMING RULE - DO NOT CROP:
- The ENTIRE clothing item must be fully visible in the frame
- Do NOT crop, cut off, or hide ANY part of the garment
- All edges, hems, seams, and details must be visible
"""


# ---------------------------------------------------------------------------
# TOPS: 7 views - front, back, side, full-body, detail, casual, folded
# ---------------------------------------------------------------------------

def _tops_front(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product from an online store catalog. Examine every detail - the exact color, fabric texture, seams, collar shape, sleeve length, any prints or logos, buttons, zippers, pockets, and all design elements.

You must reproduce this EXACT same item faithfully. This is NOT creative generation - this is product photography.

{_gender_text(gender)}

FRONT VIEW - Model facing the camera, wearing the EXACT same garment from the reference image.

Pose: Standing straight, shoulders square to camera, arms relaxed at sides, natural upright stance, weight evenly distributed on both feet.

Framing: Upper body shot from head to mid-hip/upper thigh area. The ENTIRE top/shirt/jacket must be fully visible - collar/neckline at top, bottom hem at bottom, both sleeves, front design elements.

{_STRICT_RULES}
{_NO_CROP}

For tops specifically:
- The entire garment from collar to bottom hem must be visible
- Both sleeves must be fully shown to their ends
- Front design (prints, text, logos, buttons, zippers) must be IDENTICAL to reference
- Collar/neckline construction must match reference exactly
- Natural fabric drape and wrinkles
- Same color - no shifts, no tinting

Result: A professional front-view e-commerce product photo. The garment on the model must be the EXACT SAME item as in the reference image, with zero differences in design, color, or details."""


def _tops_back(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, seams, any design elements visible from the front. Use these details to infer what the back looks like.

You must reproduce the EXACT same item faithfully. The back view must be consistent with the front view shown in the reference.

{_gender_text(gender)}

BACK VIEW - Model facing AWAY from camera, showing the back of the SAME clothing item from the reference.

Pose: Standing with back to camera, shoulders square, showing entire back of garment. Head turned slightly to side (showing profile), natural upright stance.

Framing: Upper body from behind, head to mid-hip/upper thigh. The ENTIRE BACK of the top must be visible - back collar, back design, back hem.

{_STRICT_RULES}
{_NO_CROP}

For back view specifically:
- Show the COMPLETE back of the garment
- Back design must be CONSISTENT with the front shown in reference - same color, same fabric, same style
- Back collar/neckline visible
- If the front has a hood, show the back of the hood
- Back pockets if applicable
- Same color as reference - no shifts

Result: A professional back-view e-commerce product photo. The garment must be the EXACT SAME item as in the reference, showing the back side with consistent color, fabric, and design."""


def _tops_side(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product from an online store catalog. Examine every detail - the exact color, fabric texture, seams, sleeve length, and all design elements.

You must reproduce this EXACT same item faithfully from a side angle.

{_gender_text(gender)}

SIDE VIEW (three-quarter angle) - Model at 30-45 degrees to camera, wearing the EXACT same garment from the reference.

Pose: Three-quarter turn, one foot slightly forward, natural relaxed stance, showing side profile of the garment and how it fits.

Framing: Upper body from side angle, head to mid-hip. The ENTIRE garment visible from the side perspective.

{_STRICT_RULES}
{_NO_CROP}

For side view specifically:
- Show how the garment fits from the side - silhouette, drape, sleeve length
- Side seam visible
- How the fabric hangs naturally from the side
- Shoulder slope and armhole from side angle
- Same color, same fabric, same details as reference

Result: A professional side-view e-commerce product photo showing the EXACT same top from the reference at a 3/4 angle, showing fit and silhouette."""


def _tops_full_body(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product from an online store catalog. Examine every detail - the exact color, fabric, design elements, seams, and all features.

You must reproduce this EXACT same item faithfully in a full-body shot.

{_gender_text(gender)}

FULL BODY FRONT VIEW - Model shown from head to toe, wearing the EXACT same garment from the reference.

Pose: Full body front-facing pose, standing straight, natural confident stance, hands relaxed at sides or one hand slightly in pocket, feet shoulder-width apart.

Framing: FULL BODY - the entire model from HEAD to TOES must be visible. No cropping of head, feet, or any body part.

{_STRICT_RULES}

For full body specifically:
- The TOP from the reference is the PRIMARY FOCUS - must be sharp, detailed, and clearly visible
- Model wears simple neutral pants (dark jeans or black trousers) that complement the top - these are NOT the focus
- The top must occupy the visual center of attention
- Same color, same fabric, same details as reference
- Full body gives context but the top is what matters

Result: A professional full-body fashion photo (head to toe visible) showing the EXACT same top from the reference as the primary focus."""


def _tops_detail(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine the fabric texture, stitching, collar construction, any prints or logos, buttons, zippers - every small detail.

You must reproduce a close-up of the EXACT same item, showing these details faithfully.

{_gender_text(gender)}

CLOSE-UP DETAIL VIEW - Focused on the upper portion and key details of the EXACT same garment from the reference.

Pose: Natural pose showing upper chest/collar/shoulder area of the garment, slight angle to highlight details.

Framing: Close-up on collar, neckline, chest area, shoulder region of the garment.

{_STRICT_RULES}

For detail view specifically:
- Fabric texture and weave must be clearly visible
- Stitching quality and seams clearly visible
- Collar/neckline construction detail
- Any prints, logos, text, or embroidery must be sharp and readable
- Buttons, zippers, snaps if present - realistic and detailed
- Same color, same material appearance as reference

Result: A professional close-up detail photo showing fabric texture, stitching, and design details of the EXACT same top from the reference."""


def _tops_casual(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, design, seams, and all features.

You must reproduce this EXACT same item faithfully in a casual pose.

{_gender_text(gender)}

CASUAL/RELAXED POSE - Natural, everyday stance, wearing the EXACT same garment from the reference.

Pose: Slight body lean, relaxed shoulders, one hand maybe touching collar or in pocket, head tilted slightly, natural comfortable stance.

Framing: Upper body to mid-hip, entire top visible including hemline.

{_STRICT_RULES}
{_NO_CROP}

For casual pose specifically:
- Show how the garment looks in a natural, relaxed pose
- Natural fabric drape and movement
- How the top moves with the body in a casual stance
- The entire top must still be visible
- Same color, same design, same details as reference

Result: A casual lifestyle photo showing the EXACT same top from the reference in a relaxed pose, professional quality, zero design differences."""


def _tops_folded() -> str:
    return f"""You are creating a clean product photo of a folded clothing item.

Task: Create a photo of the same clothing item from the reference, folded neatly like a real product shot for an online store catalog.

Composition:
- Single folded garment centered on pure white/light gray background
- Clean, neat fold like a retail store display
- Ample margins around the folded item
- Entire folded garment fully visible
- NO human model, NO mannequin - just the folded item

Color and design must match the reference exactly.

Result: A clean folded product photo suitable for an online store catalog, matching the reference item exactly."""


# ---------------------------------------------------------------------------
# BOTTOMS: 8 views - front full-body, back full-body, side, detail, walking, 3/4, casual, flat
# CRITICAL: ALL views must show FULL LENGTH - waistband to hem/ankles
# ---------------------------------------------------------------------------

def _bottoms_front(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product from an online store catalog. Examine every detail - the exact color, fabric texture, waistband, pockets, seams, any prints or design elements, hem style, and leg shape.

You must reproduce this EXACT same item faithfully. This is NOT creative generation - this is product photography.

{_gender_text(gender)}

FRONT VIEW - FULL BODY - Model facing the camera, wearing the EXACT same pants/bottoms from the reference.

Pose: Standing straight, feet shoulder-width apart, legs straight, weight evenly distributed, natural upright stance.

Framing: FULL BODY - head to TOES must be visible. The pants MUST be shown from WAISTBAND all the way down to the BOTTOM HEM/ANKLES.

{_STRICT_RULES}

CRITICAL FOR BOTTOMS - NO EXCEPTIONS:
- FULL LENGTH VISIBLE: Every inch of the pants from waistband to hem must be in the frame
- NO CROPPING: Do NOT cut off the bottom of the legs, the hem, or the feet/shoes
- ACCURATE WIDTH: Show the EXACT width of the pants as in the reference - do NOT make them narrower or wider. If they are slim fit, show slim. If wide-leg, show wide-leg. If baggy, show baggy.
- LEG SHAPE: Leg shape, taper, and fit must match reference exactly
- WAISTBAND: Waistband must be visible (button, zipper, drawstring, elastic - as shown in reference)
- POCKETS: Front and back pockets in correct positions
- HEM: Bottom hem visible and shown accurately (cuffed, straight, tapered, elastic - as in reference)
- CREASES/PLEATS: Any existing creases or pleats preserved
- Same color as reference - no shifts, no tinting

Result: A professional front-view full-body e-commerce photo showing the EXACT same pants from the reference, complete from waistband to hem with accurate width and fit."""


def _bottoms_back(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, waistband, pockets, seams, and all design elements. Use these to create a consistent back view.

You must reproduce the EXACT same item faithfully. The back view must be consistent with the front shown in the reference.

{_gender_text(gender)}

BACK VIEW - FULL BODY - Model facing AWAY from camera, showing the back of the EXACT same pants from the reference.

Pose: Standing with back to camera, feet shoulder-width apart, natural upright stance. Head turned slightly to show profile.

Framing: FULL BODY from behind - head to TOES visible. The pants shown from WAISTBAND to BOTTOM HEM from behind.

{_STRICT_RULES}

CRITICAL FOR BOTTOMS BACK VIEW:
- FULL LENGTH VISIBLE from behind: Entire back of pants from waistband to hem
- BACK POCKETS: Accurately positioned and styled, consistent with front view in reference
- BACK WAISTBAND: Detail visible (label patch, elastic, etc.)
- CENTER BACK SEAM: Naturally visible
- BACK HEM: Visible from behind, accurate width maintained
- BACK DESIGN: Any back embroidery, patches, or design elements consistent with reference
- Same color as reference - no shifts

Result: A professional back-view full-body e-commerce photo showing the EXACT same pants from the reference, back view complete from waistband to hem."""


def _bottoms_side(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, seams, pockets, and all features.

You must reproduce this EXACT same item faithfully from a side angle.

{_gender_text(gender)}

SIDE VIEW - FULL BODY - Model at 30-45 degree angle to camera, wearing the EXACT same pants from the reference.

Pose: Three-quarter side view, natural stance, one foot slightly forward, showing side profile of the pants.

Framing: FULL BODY from side - head to TOES visible. Side profile of entire pants.

{_STRICT_RULES}

For bottoms side view:
- FULL LENGTH visible from side angle
- Side seam line naturally visible
- Side pocket opening visible if present
- Leg width and taper shown accurately from side
- How the pants drape from the side angle
- Accurate width - no distortion
- Same color as reference

Result: A professional side-view full-body e-commerce photo showing the EXACT same pants from the reference, side profile from waistband to hem."""


def _bottoms_detail(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine the waistband construction, button/zipper, pocket details, fabric texture, stitching - every small detail.

You must reproduce a close-up of the EXACT same item, showing these details faithfully.

{_gender_text(gender)}

CLOSE-UP DETAIL VIEW - Focused on the waistband and upper portion of the EXACT same pants from the reference.

Pose: Natural standing pose showing the upper portion of the pants (waistband to mid-thigh area).

Framing: Close-up on waistband, button/zipper fly, front pockets, and upper thigh area.

{_STRICT_RULES}

For bottoms detail:
- Waistband construction clearly visible (button, zipper, drawstring, elastic)
- Front pockets detail - construction, stitching
- Button, zipper fly, rivets realistic and detailed
- Fabric texture and weave clearly visible
- Seam quality and stitching visible
- Any labels or tags visible
- Same color, same material as reference

Result: A professional close-up detail photo of the EXACT same pants from the reference, showing waistband, pockets, fabric texture, and construction quality."""


def _bottoms_walking(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, design, seams, and all features.

You must reproduce this EXACT same item faithfully in a walking pose.

{_gender_text(gender)}

WALKING POSE - FULL BODY - Model in a natural walking stance, wearing the EXACT same pants from the reference.

Pose: Mid-stride walking pose, one foot forward, natural walking motion, arms swinging naturally.

Framing: FULL BODY - head to TOES visible, showing the pants in motion.

{_STRICT_RULES}

For walking pose:
- FULL LENGTH visible even in walking pose
- Show how the pants drape, stretch, and move during walking
- Natural fabric behavior in motion
- Leg movement showing fit during stride
- Same color, same design, same details as reference

Result: A professional walking pose fashion photo showing the EXACT same pants from the reference in motion, full body visible."""


def _bottoms_34(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, design, seams, pockets, and all features.

You must reproduce this EXACT same item faithfully from a 3/4 angle.

{_gender_text(gender)}

THREE-QUARTER ANGLE - FULL BODY - Model at 3/4 angle to camera, wearing the EXACT same pants from the reference.

Pose: Three-quarter turn toward camera, one foot slightly forward, natural relaxed stance.

Framing: FULL BODY at 3/4 angle - head to TOES visible.

{_STRICT_RULES}

For 3/4 angle:
- FULL LENGTH visible
- Shows both front and side of pants simultaneously
- Best view of overall fit and shape
- Accurate width from angled perspective
- Same color, same design, same details as reference

Result: A professional 3/4-angle full-body e-commerce photo showing the EXACT same pants from the reference, front and side simultaneously visible."""


def _bottoms_casual(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL clothing product. Examine every detail - the exact color, fabric, design, seams, and all features.

You must reproduce this EXACT same item faithfully in a casual pose.

{_gender_text(gender)}

CASUAL RELAXED POSE - FULL BODY - Natural, everyday stance, wearing the EXACT same pants from the reference.

Pose: Relaxed stance, slight lean against imaginary wall or surface, one hand in pocket, casual comfortable posture.

Framing: FULL BODY - head to TOES visible.

{_STRICT_RULES}
{_NO_CROP}

For casual pose:
- FULL LENGTH visible
- Show how pants look in a relaxed everyday stance
- Natural fabric drape in casual pose
- Entire pants from waistband to hem visible
- Same color, same design, same details as reference

Result: A casual lifestyle photo showing the EXACT same pants from the reference in a relaxed pose, full body visible, professional quality."""


def _bottoms_flat() -> str:
    return f"""You are creating a clean product photo of a laid-flat clothing item.

Task: Create a photo of the same pants/bottoms from the reference, laid flat on a clean surface like a real product shot for an online store catalog.

Composition:
- Single garment laid flat, centered on pure white/light gray background
- Neatly arranged as if in a retail catalog
- Entire garment fully visible - waistband to hem
- NO human model, NO mannequin - just the flat-lay item
- Show front of the pants

Color, design, and proportions must match the reference exactly.

Result: A clean flat-lay product photo suitable for an online store catalog, matching the reference pants exactly."""


# ---------------------------------------------------------------------------
# ACCESSORIES: 4 views - front, detail, in-use, lifestyle
# ---------------------------------------------------------------------------

def _accessories_front(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL accessory product from an online store catalog. Examine every detail - the exact color, material, texture, shape, size, hardware, stitching, labels, and all design elements.

You must reproduce this EXACT same item faithfully. This is NOT creative generation - this is product photography.

{_gender_text(gender)}

FRONT VIEW - Model wearing or holding the EXACT same accessory from the reference.

Pose: Front-facing pose, wearing or holding the accessory naturally.

Framing: Clear view of the accessory as the primary focus.

{_STRICT_RULES}

Result: A professional front-view e-commerce photo showing the EXACT same accessory from the reference, zero differences in design, color, or details."""


def _accessories_detail(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL accessory product. Examine every detail - material texture, stitching, hardware, labels, construction, color.

You must reproduce a close-up of the EXACT same item faithfully.

{_gender_text(gender)}

CLOSE-UP DETAIL VIEW of the EXACT same accessory from the reference.

Framing: Close-up showing material texture, stitching, hardware, labels, construction details.

{_STRICT_RULES}

Result: A professional close-up detail photo of the EXACT same accessory from reference, showing quality and craftsmanship."""


def _accessories_inuse(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL accessory product. Examine every detail - the exact color, material, shape, and all features.

You must reproduce this EXACT same item faithfully in use.

{_gender_text(gender)}

IN-USE VIEW - Model using the EXACT same accessory naturally in a real-world context.

Pose: Natural pose showing the accessory being used (bag being carried, hat being worn, etc.)

Framing: Medium shot showing the accessory in context.

{_STRICT_RULES}

Result: A lifestyle photo showing the EXACT same accessory from reference in natural use, zero design differences."""


def _accessories_lifestyle(gender: str) -> str:
    return f"""FIRST: Carefully study the reference image. This is a REAL accessory product. Examine every detail - the exact color, material, shape, and all features.

You must reproduce this EXACT same item faithfully in a lifestyle setting.

{_gender_text(gender)}

LIFESTYLE VIEW - Casual, everyday context showing the EXACT same accessory from the reference.

Pose: Relaxed casual pose, natural environment feel.

Framing: Medium shot, accessory clearly visible.

{_STRICT_RULES}

Result: A casual lifestyle photo showing the EXACT same accessory from reference in natural everyday context."""


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

def build_prompts_for_product(
    category: str = "clothing",
    gender: str = "unisex",
    color_hex: str = "#000000",
    color_name: str = "colorful",
    image_type: str = "all",
    count: int = None,
) -> list[dict]:
    """
    Build prompts for AI photo generation.

    Args:
        category: Product category (shirt, pants, hat, etc.)
        gender: male/female/unisex
        color_hex: Hex color code
        color_name: Color name
        image_type: "all", "front", "back", "side", "detail", "full_body"
        count: Override number of photos to generate

    Returns:
        List of dicts with keys: view, label, prompt
    """
    block_type = _detect_block_type(category)

    if block_type == "tops":
        views = [
            ("front", "Front View", _tops_front(gender)),
            ("back", "Back View", _tops_back(gender)),
            ("side", "Side View", _tops_side(gender)),
            ("full_body", "Full Body", _tops_full_body(gender)),
            ("detail", "Detail View", _tops_detail(gender)),
            ("casual", "Casual Pose", _tops_casual(gender)),
            ("folded", "Folded", _tops_folded()),
        ]
    elif block_type == "bottoms":
        views = [
            ("front", "Front Full Body", _bottoms_front(gender)),
            ("back", "Back Full Body", _bottoms_back(gender)),
            ("side", "Side View", _bottoms_side(gender)),
            ("detail", "Detail View", _bottoms_detail(gender)),
            ("walking", "Walking Pose", _bottoms_walking(gender)),
            ("34_angle", "3/4 Angle", _bottoms_34(gender)),
            ("casual", "Casual Pose", _bottoms_casual(gender)),
            ("flat", "Flat Lay", _bottoms_flat()),
        ]
    else:
        views = [
            ("front", "Front View", _accessories_front(gender)),
            ("detail", "Detail View", _accessories_detail(gender)),
            ("in_use", "In Use", _accessories_inuse(gender)),
            ("lifestyle", "Lifestyle", _accessories_lifestyle(gender)),
        ]

    # Filter by image_type if not "all"
    if image_type and image_type != "all":
        views = [(v, label, p) for v, label, p in views if v == image_type or v.startswith(image_type)]
        if not views:
            views = views[:1] if views else views

    if count is not None:
        views = views[:count]

    return [{"view": v, "label": label, "prompt": p} for v, label, p in views]


def build_prompts(rgb_str: str) -> list[str]:
    """Legacy function - returns prompts for backward compatibility."""
    prompts_data = build_prompts_for_product(
        category="clothing",
        gender="unisex",
        color_hex=rgb_str,
    )
    return [p["prompt"] for p in prompts_data]
