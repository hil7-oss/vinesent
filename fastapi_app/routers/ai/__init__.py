# routers/ai/__init__.py
# AI domain: photo generation, virtual try-on, prompt management
from .ai_photos import router as ai_photos_router
from .ai_tryon import router as ai_tryon_router
from .prompts import router as prompts_router

__all__ = ["ai_photos_router", "ai_tryon_router", "prompts_router"]
