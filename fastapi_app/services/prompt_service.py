
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

def get_default_template(category: str, gender: str, image_type: str = "front") -> str:
    """
    Returns a default prompt template based on category, gender, and image type.
    
    Args:
        category: Clothing category (pants, tshirt, jacket, etc.)
        gender: male, female, or unisex
        image_type: front, back, or side
    """
    # Base description
    base = "High-quality studio fashion photo of a child/teen model (age 7–16) wearing {color_name} {category}. "
    
    # Gender-specific details
    if gender == 'female':
        base += "Teen girl model, youthful face, adolescent proportions. "
    elif gender == 'male':
        base += "Teen boy model, youthful face, adolescent proportions. "
    else:
        base += "Teen model, youthful face, adolescent proportions. "
    
    # View-specific instructions
    if image_type == "back":
        base += "BACK VIEW: Model facing away from camera, showing the back of the clothing. "
        base += "Focus on back design, prints, patterns, and details. "
        base += "Model's back is centered, head slightly turned to show profile. "
        base += "Preserve all back design elements: logos, text, graphics, embroidery. "
        base += "Maintain fabric texture and realistic wrinkles. "
    elif image_type == "side":
        base += "SIDE VIEW: Model in profile, showing side silhouette of the clothing. "
        base += "Focus on garment fit, length, and side details. "
        base += "Model standing naturally, side profile clearly visible. "
    else:  # front (default)
        base += "FRONT VIEW: Model facing camera, showing the front of the clothing. "
        base += "Focus on front design, neckline, and overall appearance. "
    
    # Common ending
    base += "Neutral white background, soft diffused studio lighting, photorealistic, crisp detail, realistic texture, high resolution."
    
    return base
