import os

from fastapi import APIRouter, HTTPException, Response

from fastapi_app.config import UPLOADS_DIR

router = APIRouter(tags=["utility"])

os.makedirs(UPLOADS_DIR, exist_ok=True)


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/uploads/{file_id}")
def get_upload(file_id: str):
    for ext in ["", ".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        path = os.path.join(UPLOADS_DIR, f"{file_id}{ext}")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return Response(content=f.read(), media_type="image/jpeg")
    raise HTTPException(404, "File not found")
