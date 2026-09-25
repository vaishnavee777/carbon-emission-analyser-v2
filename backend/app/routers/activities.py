from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import grid
from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, EmissionFactor, User
from app.schemas import ActivityCreate, ActivityResponse


router = APIRouter(
    prefix="/activities",
    tags=["Activities"],
)


def calculate_emissions(
    db: Session,
    category: str,
    activity_name: str,
    unit: str,
    quantity: float,
    static_factor: float,
    when: datetime | None = None,
) -> tuple[float, float | None]:
    """Returns (kg CO2e, grid intensity used). Grid electricity uses the intensity for the hour it happened."""
    if (category, activity_name, unit) == grid.GRID_ACTIVITY:
        intensity = grid.intensity_at(db, when) if when else grid.current_intensity(db)
        if intensity.source != "static":
            return quantity * intensity.g_per_kwh / 1000, intensity.g_per_kwh
    return quantity * static_factor, None


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
    user: User = Depends(get_current_user),
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

    emissions, grid_intensity = calculate_emissions(
        db,
        activity.category,
        activity.activity,
        activity.unit,
        activity.quantity,
        float(emission_factor.factor),
        activity.activity_date,
    )

    # Create database record
    new_activity = Activity(
        user_id=user.id,
        emission_factor_id=emission_factor.id,
        category=activity.category,
        activity=activity.activity,
        quantity=activity.quantity,
        unit=activity.unit,
        emissions=emissions,
        grid_intensity=grid_intensity,
        activity_date=activity.activity_date or datetime.utcnow(),
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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == user.id
        )
        .order_by(
            Activity.activity_date.desc()
        )
        .all()
    )

    return activities

# ---------------------------------------------------------
# POST /activities/repeat-yesterday
# Copy the user's most recent logged day onto today, so a
# notification action can log a typical day without opening the app
# ---------------------------------------------------------

@router.post(
    "/repeat-yesterday",
    response_model=list[ActivityResponse],
)
def repeat_yesterday(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_start = datetime.combine(datetime.utcnow().date(), time.min)

    latest = (
        db.query(Activity)
        .filter(
            Activity.user_id == user.id,
            Activity.activity_date < today_start,
        )
        .order_by(Activity.activity_date.desc())
        .first()
    )

    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="No previous activity to repeat.",
        )

    day_start = datetime.combine(latest.activity_date.date(), time.min)
    source = (
        db.query(Activity)
        .filter(
            Activity.user_id == user.id,
            Activity.activity_date >= day_start,
            Activity.activity_date < day_start + timedelta(days=1),
        )
        .all()
    )

    now = datetime.utcnow()
    copies = []
    for a in source:
        emissions, grid_intensity = calculate_emissions(
            db,
            a.category,
            a.activity,
            a.unit,
            float(a.quantity),
            float(a.emissions) / float(a.quantity) if a.quantity else 0.0,
        )
        copies.append(
            Activity(
                user_id=a.user_id,
                emission_factor_id=a.emission_factor_id,
                category=a.category,
                activity=a.activity,
                quantity=a.quantity,
                unit=a.unit,
                emissions=emissions,
                grid_intensity=grid_intensity,
                activity_date=now,
            )
        )

    db.add_all(copies)
    db.commit()
    for copy in copies:
        db.refresh(copy)

    return copies
