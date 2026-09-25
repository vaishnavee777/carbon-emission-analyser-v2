import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import func
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from app.models import EmissionFactor, GridIntensityReading

logger = logging.getLogger(__name__)

GRID_ACTIVITY = ("Electricity", "Grid Electricity", "kWh")
FRESH_FOR = timedelta(minutes=15)
STALE_AFTER = timedelta(hours=24)
DEFAULT_STATIC_G_PER_KWH = 475.0


@dataclass
class GridIntensity:
    zone: str
    g_per_kwh: float
    source: str  # "live" | "cached" | "historical" | "static"
    measured_at: datetime | None
    is_estimated: bool


def zone() -> str:
    return os.getenv("GRID_ZONE", "IN-SO")


def api_key() -> str | None:
    return os.getenv("ELECTRICITYMAPS_API_KEY") or None


def _base_url() -> str:
    return os.getenv("ELECTRICITYMAPS_BASE_URL", "https://api.electricitymaps.com/v3").rstrip("/")


def _parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def _parse_point(point: dict) -> dict | None:
    intensity = point.get("carbonIntensity")
    measured = point.get("datetime")
    if intensity is None or measured is None:
        return None
    return {
        "carbon_intensity": float(intensity),
        "measured_at": _parse_time(measured),
        "is_estimated": bool(point.get("isEstimated", False)),
    }


def _get(path: str, grid_zone: str) -> dict:
    response = httpx.get(
        f"{_base_url()}{path}",
        params={"zone": grid_zone},
        headers={"auth-token": api_key()},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def _store(db: Session, grid_zone: str, points: list[dict]) -> int:
    if not points:
        return 0
    now = datetime.utcnow()
    statement = insert(GridIntensityReading).values(
        [{**p, "zone": grid_zone, "fetched_at": now} for p in points]
    )
    # Estimates get revised upstream, so refresh existing rows for the same hour.
    statement = statement.on_duplicate_key_update(
        carbon_intensity=statement.inserted.carbon_intensity,
        is_estimated=statement.inserted.is_estimated,
        fetched_at=statement.inserted.fetched_at,
    )
    db.execute(statement)
    db.commit()
    return len(points)


def poll(db: Session, include_history: bool = False) -> int:
    """Fetch the latest reading (and optionally the past 24h) from Electricity Maps."""
    if api_key() is None:
        return 0

    grid_zone = zone()
    points = []
    try:
        if include_history:
            history = _get("/carbon-intensity/history", grid_zone).get("history", [])
            points.extend(filter(None, map(_parse_point, history)))
        latest = _parse_point(_get("/carbon-intensity/latest", grid_zone))
        if latest:
            points.append(latest)
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Electricity Maps request failed for %s: %s", grid_zone, error)

    # History and latest can overlap on the current hour.
    unique = {p["measured_at"]: p for p in points}
    return _store(db, grid_zone, list(unique.values()))


def static_intensity(db: Session) -> float:
    factor = (
        db.query(EmissionFactor.factor)
        .filter(
            EmissionFactor.category == GRID_ACTIVITY[0],
            EmissionFactor.activity == GRID_ACTIVITY[1],
            EmissionFactor.unit == GRID_ACTIVITY[2],
        )
        .scalar()
    )
    return float(factor) * 1000 if factor is not None else DEFAULT_STATIC_G_PER_KWH


def _latest_reading(db: Session, grid_zone: str) -> GridIntensityReading | None:
    return (
        db.query(GridIntensityReading)
        .filter(GridIntensityReading.zone == grid_zone)
        .order_by(GridIntensityReading.measured_at.desc())
        .first()
    )


def current_intensity(db: Session) -> GridIntensity:
    grid_zone = zone()
    latest = _latest_reading(db, grid_zone)
    now = datetime.utcnow()

    if api_key() and (latest is None or now - latest.fetched_at > FRESH_FOR):
        poll(db)
        latest = _latest_reading(db, grid_zone)

    if latest is not None and now - latest.fetched_at <= STALE_AFTER:
        return GridIntensity(
            zone=grid_zone,
            g_per_kwh=float(latest.carbon_intensity),
            source="live" if now - latest.fetched_at <= FRESH_FOR else "cached",
            measured_at=latest.measured_at,
            is_estimated=latest.is_estimated,
        )

    return GridIntensity(
        zone=grid_zone,
        g_per_kwh=static_intensity(db),
        source="static",
        measured_at=None,
        is_estimated=True,
    )


def _reading_covering(db: Session, grid_zone: str, when: datetime) -> GridIntensityReading | None:
    """Readings are hourly and stamped at the start of the hour they cover."""
    candidates = (
        db.query(GridIntensityReading)
        .filter(
            GridIntensityReading.zone == grid_zone,
            GridIntensityReading.measured_at > when - timedelta(minutes=90),
            GridIntensityReading.measured_at <= when + timedelta(minutes=30),
        )
        .all()
    )
    if not candidates:
        return None
    covering = [r for r in candidates if r.measured_at <= when]
    if covering:
        return max(covering, key=lambda r: r.measured_at)
    return min(candidates, key=lambda r: r.measured_at - when)


def intensity_at(db: Session, when: datetime) -> GridIntensity:
    """Grid intensity for the hour `when` (naive UTC) happened in."""
    now = datetime.utcnow()
    if now - when <= FRESH_FOR:
        return current_intensity(db)

    grid_zone = zone()
    reading = _reading_covering(db, grid_zone, when)
    if reading is None and api_key() and now - when <= timedelta(hours=24):
        poll(db, include_history=True)
        reading = _reading_covering(db, grid_zone, when)

    if reading is not None:
        return GridIntensity(
            zone=grid_zone,
            g_per_kwh=float(reading.carbon_intensity),
            source="historical",
            measured_at=reading.measured_at,
            is_estimated=reading.is_estimated,
        )

    return GridIntensity(
        zone=grid_zone,
        g_per_kwh=static_intensity(db),
        source="static",
        measured_at=None,
        is_estimated=True,
    )


def recent_readings(db: Session, hours: int = 24) -> list[GridIntensityReading]:
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(GridIntensityReading)
        .filter(GridIntensityReading.zone == zone(), GridIntensityReading.measured_at >= since)
        .order_by(GridIntensityReading.measured_at)
        .all()
    )


def has_readings(db: Session) -> bool:
    return (
        db.query(func.count(GridIntensityReading.id))
        .filter(GridIntensityReading.zone == zone())
        .scalar()
        > 0
    )
