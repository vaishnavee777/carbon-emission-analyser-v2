from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import grid
from app.database import get_db

router = APIRouter(
    prefix="/grid",
    tags=["Grid"],
)

MIN_READINGS_FOR_LEVEL = 4


@router.get("/intensity")
def get_intensity(db: Session = Depends(get_db)):
    current = grid.current_intensity(db)
    readings = grid.recent_readings(db, hours=24)
    values = [float(r.carbon_intensity) for r in readings]

    level = None
    average = None
    if current.source != "static" and len(values) >= MIN_READINGS_FOR_LEVEL:
        average = sum(values) / len(values)
        ratio = current.g_per_kwh / average
        level = "low" if ratio < 0.9 else "high" if ratio > 1.1 else "moderate"

    return {
        "zone": current.zone,
        "g_per_kwh": round(current.g_per_kwh, 1),
        "source": current.source,
        "provider": "Electricity Maps" if current.source != "static" else None,
        "measured_at": f"{current.measured_at.isoformat()}Z" if current.measured_at else None,
        "is_estimated": current.is_estimated,
        "live_configured": grid.api_key() is not None,
        "static_g_per_kwh": round(grid.static_intensity(db), 1),
        "level": level,
        "average_24h": round(average, 1) if average is not None else None,
        "min_24h": round(min(values), 1) if values else None,
        "max_24h": round(max(values), 1) if values else None,
        "history": [
            {"measured_at": f"{r.measured_at.isoformat()}Z", "g_per_kwh": float(r.carbon_intensity)}
            for r in readings
        ],
    }


@router.get("/intensity/at")
def get_intensity_at(time: datetime, db: Session = Depends(get_db)):
    when = time.astimezone(timezone.utc).replace(tzinfo=None) if time.tzinfo else time
    if when > datetime.utcnow():
        raise HTTPException(status_code=400, detail="Time can't be in the future.")
    reading = grid.intensity_at(db, when)
    return {
        "zone": reading.zone,
        "g_per_kwh": round(reading.g_per_kwh, 1),
        "source": reading.source,
        "measured_at": f"{reading.measured_at.isoformat()}Z" if reading.measured_at else None,
        "is_estimated": reading.is_estimated,
    }
