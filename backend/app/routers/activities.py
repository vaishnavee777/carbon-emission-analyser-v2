from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Activity, EmissionFactor
from app.schemas import ActivityCreate, ActivityResponse


router = APIRouter(
    prefix="/activities",
    tags=["Activities"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------
# POST /activities/
# Create a new activity and calculate its emissions
# ---------------------------------------------------------

@router.post(
    "/",
    response_model=ActivityResponse,
)
def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
):
    # Find the appropriate emission factor
    emission_factor = (
        db.query(EmissionFactor)
        .filter(
            EmissionFactor.category == activity.category,
            EmissionFactor.activity == activity.activity,
            EmissionFactor.unit == activity.unit,
        )
        .first()
    )

    # Stop if no factor exists
    if emission_factor is None:
        raise HTTPException(
            status_code=404,
            detail="No emission factor found for this activity.",
        )

    # Calculate carbon emissions
    emissions = (
        activity.quantity
        * float(emission_factor.factor)
    )

    # Create database record
    new_activity = Activity(
        user_id=activity.user_id,
        category=activity.category,
        activity=activity.activity,
        quantity=activity.quantity,
        unit=activity.unit,
        emissions=emissions,
    )

    # Save to MySQL
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)

    return new_activity


# ---------------------------------------------------------
# GET /activities/
# Retrieve activities belonging to a user
# ---------------------------------------------------------

@router.get(
    "/",
    response_model=list[ActivityResponse],
)
def get_activities(
    user_id: int,
    db: Session = Depends(get_db),
):
    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == user_id
        )
        .order_by(
            Activity.activity_date.desc()
        )
        .all()
    )

    return activities