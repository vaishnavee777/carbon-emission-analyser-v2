from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.ml import service
from app.models import User

router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"],
)


@router.post("/train", dependencies=[Depends(get_current_user)])
def train(db: Session = Depends(get_db)):
    try:
        return service.train_model(db)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/model", dependencies=[Depends(get_current_user)])
def model_info():
    metadata = service.load_metadata()
    if metadata is None:
        raise HTTPException(status_code=404, detail="Model has not been trained yet.")
    return metadata


@router.get("/forecast")
def forecast(
    days: int = Query(default=7, ge=1, le=30),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.forecast(db, user.id, days)
