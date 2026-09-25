from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, EmissionFactor, Trip, User
from app.schemas import TripConfirm, TripCreate
from app.transport import TripFeatures, classify

router = APIRouter(
    prefix="/trips",
    tags=["Trips"],
)

MIN_DISTANCE_KM = 0.1

MODE_ORDER = [
    "Car (Petrol)", "Car (Diesel)", "Car (Electric)", "Ride Share", "Motorcycle",
    "Bus", "Metro/Subway", "Train", "Bicycle", "Walking",
    "Flight (Domestic)", "Flight (International)",
]


def _utc_naive(value):
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


def _transport_factors(db: Session) -> list[EmissionFactor]:
    return (
        db.query(EmissionFactor)
        .filter(EmissionFactor.category == "Transport", EmissionFactor.unit == "km")
        .all()
    )


def _options(factors: list[EmissionFactor], distance_km: float, detected: str) -> list[dict]:
    options = [
        {
            "activity": f.activity,
            "factor": float(f.factor),
            "estimated_kg": round(distance_km * float(f.factor), 3),
        }
        for f in factors
    ]
    rank = {mode: i for i, mode in enumerate(MODE_ORDER)}
    return sorted(options, key=lambda o: (o["activity"] != detected, rank.get(o["activity"], len(rank))))


def _get_own_trip(db: Session, trip_id: int, user: User) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None or trip.user_id != user.id:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


@router.post("/", status_code=201)
def create_trip(
    body: TripCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    started, ended = _utc_naive(body.started_at), _utc_naive(body.ended_at)
    if ended <= started:
        raise HTTPException(status_code=422, detail="Trip must end after it starts.")
    if body.distance_km < MIN_DISTANCE_KM:
        raise HTTPException(status_code=422, detail="Trip is too short to log (under 100 m).")

    detection = classify(
        TripFeatures(
            distance_km=body.distance_km,
            duration_min=(ended - started).total_seconds() / 60,
            median_speed_kmh=body.median_speed_kmh,
            p95_speed_kmh=body.p95_speed_kmh,
            speed_cv=body.speed_cv,
            stop_fraction=body.stop_fraction,
            walking_motion_fraction=body.walking_motion_fraction,
        )
    )

    trip = Trip(
        user_id=user.id,
        started_at=started,
        ended_at=ended,
        distance_km=body.distance_km,
        median_speed_kmh=body.median_speed_kmh,
        p95_speed_kmh=body.p95_speed_kmh,
        speed_cv=body.speed_cv,
        stop_fraction=body.stop_fraction,
        walking_motion_fraction=body.walking_motion_fraction,
        sample_count=body.sample_count,
        detected_mode=detection.mode,
        confidence=detection.confidence,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    return {
        "id": trip.id,
        "distance_km": round(body.distance_km, 3),
        "duration_min": round((ended - started).total_seconds() / 60, 1),
        "detected": {
            "activity": detection.mode,
            "confidence": detection.confidence,
            "reason": detection.reason,
        },
        "options": _options(_transport_factors(db), body.distance_km, detection.mode),
    }


@router.post("/{trip_id}/confirm")
def confirm_trip(
    trip_id: int,
    body: TripConfirm,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = _get_own_trip(db, trip_id, user)
    if trip.activity_id is not None:
        raise HTTPException(status_code=409, detail="Trip already logged.")

    factor = next((f for f in _transport_factors(db) if f.activity == body.activity), None)
    if factor is None:
        raise HTTPException(status_code=400, detail="Unknown transport mode.")

    activity = Activity(
        user_id=user.id,
        emission_factor_id=factor.id,
        category=factor.category,
        activity=factor.activity,
        quantity=float(trip.distance_km),
        unit=factor.unit,
        emissions=float(trip.distance_km) * float(factor.factor),
        activity_date=trip.ended_at,
    )
    db.add(activity)
    db.flush()

    trip.confirmed_mode = factor.activity
    trip.activity_id = activity.id
    db.commit()

    return {
        "activity_id": activity.id,
        "activity": factor.activity,
        "distance_km": float(trip.distance_km),
        "emissions": round(float(activity.emissions), 3),
    }


@router.delete("/{trip_id}", status_code=204)
def discard_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = _get_own_trip(db, trip_id, user)
    if trip.activity_id is not None:
        raise HTTPException(status_code=409, detail="Trip already logged.")
    db.delete(trip)
    db.commit()
