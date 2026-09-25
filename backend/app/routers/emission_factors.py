from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EmissionFactor
from app.schemas import EmissionFactorResponse

router = APIRouter(
    prefix="/emission-factors",
    tags=["Emission factors"],
)


@router.get("/", response_model=list[EmissionFactorResponse])
def list_emission_factors(db: Session = Depends(get_db)):
    return (
        db.query(EmissionFactor)
        .order_by(EmissionFactor.category, EmissionFactor.activity)
        .all()
    )
