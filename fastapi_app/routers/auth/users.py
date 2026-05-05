"""Users router - user management endpoints"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi_app.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
@router.get("/")
def list_users(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            'SELECT u."id",u."email",u."name",'
            'COALESCE(u."phone", (SELECT "customerPhone" FROM "Order" o WHERE o."userId"=u."id" AND "customerPhone" IS NOT NULL AND "customerPhone"<>\'\' ORDER BY o."createdAt" DESC LIMIT 1)) AS phone,'
            'u."createdAt" '
            'FROM "User" u ORDER BY u."createdAt" DESC'
        )
    ).mappings().all()
    return [dict(r) for r in rows]
