from dataclasses import dataclass


@dataclass
class TripFeatures:
    distance_km: float
    duration_min: float
    median_speed_kmh: float
    p95_speed_kmh: float
    speed_cv: float
    stop_fraction: float
    walking_motion_fraction: float | None


@dataclass
class Detection:
    mode: str
    confidence: float
    reason: str


def classify(t: TripFeatures) -> Detection:
    """Speed-profile heuristics. Modes match Transport emission factor names."""
    median, p95 = t.median_speed_kmh, t.p95_speed_kmh
    walking = t.walking_motion_fraction

    if walking is not None and walking >= 0.6 and median <= 9:
        return Detection("Walking", 0.9, f"Step-like motion {walking:.0%} of the time at {median:.0f} km/h")
    if p95 <= 8:
        return Detection("Walking", 0.8, f"Never faster than {p95:.0f} km/h")
    if p95 >= 250:
        mode = "Flight (Domestic)" if t.distance_km < 1500 else "Flight (International)"
        return Detection(mode, 0.75, f"Top speed {p95:.0f} km/h")
    if p95 <= 30 and median <= 22 and (walking is None or walking < 0.6):
        return Detection("Bicycle", 0.55, f"Steady {median:.0f} km/h, topping out at {p95:.0f} km/h")
    if median >= 60 and t.speed_cv <= 0.3 and t.stop_fraction < 0.1:
        return Detection("Train", 0.5, f"Sustained {median:.0f} km/h with very even speed")
    if t.stop_fraction >= 0.3 and median < 35:
        return Detection("Bus", 0.55, f"Stopped {t.stop_fraction:.0%} of the time, {median:.0f} km/h when moving")
    return Detection("Car (Petrol)", 0.6, f"{median:.0f} km/h typical, up to {p95:.0f} km/h")
