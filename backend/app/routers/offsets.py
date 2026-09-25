from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import offsets
from app.auth import get_current_user
from app.database import get_db
from app.models import User

router = APIRouter(
    prefix="/offsets",
    tags=["Offsets"],
)


@router.get("/suggestions")
def get_suggestions(
    days: int = Query(default=30, ge=7, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return offsets.suggestions(db, user.id, days)
