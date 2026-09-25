from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import grid
from app.models import Activity, EmissionFactor

# A mature tree absorbs roughly 21 kg CO2 a year (commonly cited average; varies by species and climate).
TREE_KG_PER_YEAR = 21.0


@dataclass
class OffsetType:
    name: str
    kind: str  # "removal" | "avoidance"
    durability: str
    price_usd_per_t: tuple[float, float]


# Indicative voluntary-market price ranges; they move over time.
OFFSET_TYPES = [
    OffsetType("Renewable energy projects", "avoidance", "Avoids future emissions; additionality is often weak", (2, 10)),
    OffsetType("Clean cookstoves", "avoidance", "Avoids emissions and improves health", (5, 15)),
    OffsetType("Reforestation", "removal", "Stores carbon for decades, but fires or logging can release it", (10, 35)),
    OffsetType("Biochar", "removal", "Stores carbon for centuries", (100, 200)),
    OffsetType("Direct air capture with storage", "removal", "Stores carbon for thousands of years", (400, 1000)),
]


@dataclass
class Swap:
    sources: tuple[str, ...]
    target: str | None
    share: float
    title: str
    detail: str


# share = fraction of the source activity assumed to change.
SWAPS = [
    Swap(("Car (Petrol)", "Car (Diesel)", "Ride Share"), "Bus", 0.3,
         "Take the bus for 3 in 10 car trips", "{qty:.0f} km by car"),
    Swap(("Flight (Domestic)",), "Train", 0.5,
         "Take the train instead of half your domestic flights", "{qty:.0f} km flown domestically"),
    Swap(("Beef", "Lamb"), "Chicken", 0.5,
         "Swap half your red meat for chicken", "{qty:.1f} kg of beef or lamb"),
    Swap(("Landfill Waste",), "Recycled Waste", 0.5,
         "Recycle or compost half your landfill waste", "{qty:.1f} kg sent to landfill"),
    Swap(("Natural Gas", "LPG", "Heating Oil"), None, 0.1,
         "Turn heating down 1°C (about 10% less fuel)", "{kg:.1f} kg from heating"),
]


def _factors(db: Session) -> dict[str, float]:
    return {f.activity: float(f.factor) for f in db.query(EmissionFactor).all()}


def _grid_shift(db: Session, rows: list[Activity]) -> dict | None:
    """Savings from moving flexible electricity use into the cleanest hours of the day."""
    grid_rows = [a for a in rows if (a.category, a.activity, a.unit) == grid.GRID_ACTIVITY]
    kwh = sum(float(a.quantity) for a in grid_rows)
    readings = [float(r.carbon_intensity) for r in grid.recent_readings(db, hours=24)]
    if kwh <= 0 or len(readings) < 4:
        return None
    average, cleanest = sum(readings) / len(readings), min(readings)
    saving = kwh * 0.3 * (average - cleanest) / 1000
    return {
        "category": "Electricity",
        "title": "Run 30% of your electricity use in the grid's cleanest hours",
        "detail": f"{kwh:.0f} kWh from the grid. Today's cleanest hour was {cleanest:.0f} g/kWh vs {average:.0f} on average",
        "saving_kg": saving,
    }


def suggestions(db: Session, user_id: int, days: int) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(Activity)
        .filter(Activity.user_id == user_id, Activity.activity_date >= since)
        .all()
    )
    footprint = sum(float(a.emissions) for a in rows)
    per_year = 365 / days

    by_category: dict[str, float] = {}
    for a in rows:
        by_category[a.category] = by_category.get(a.category, 0.0) + float(a.emissions)

    factors = _factors(db)
    reductions = []
    for swap in SWAPS:
        matching = [a for a in rows if a.activity in swap.sources]
        if not matching:
            continue
        qty = sum(float(a.quantity) for a in matching)
        kg = sum(float(a.emissions) for a in matching)
        if swap.target is None:
            saving = kg * swap.share
        else:
            target_factor = factors.get(swap.target)
            if target_factor is None:
                continue
            saving = kg * swap.share - qty * swap.share * target_factor
        reductions.append({
            "category": matching[0].category,
            "title": swap.title,
            "detail": swap.detail.format(qty=qty, kg=kg),
            "saving_kg": saving,
        })

    shift = _grid_shift(db, rows)
    if shift:
        reductions.append(shift)

    reductions = sorted(
        (r for r in reductions if r["saving_kg"] >= 0.05),
        key=lambda r: r["saving_kg"],
        reverse=True,
    )[:4]
    for r in reductions:
        r["saving_kg_per_year"] = round(r["saving_kg"] * per_year, 1)
        r["saving_kg"] = round(r["saving_kg"], 2)

    remaining = max(0.0, footprint - sum(r["saving_kg"] for r in reductions))
    remaining_t = remaining / 1000

    return {
        "period_days": days,
        "footprint_kg": round(footprint, 2),
        "annualised_kg": round(footprint * per_year, 1),
        "trees_to_absorb_a_year": round(footprint * per_year / TREE_KG_PER_YEAR),
        "by_category": [
            {"category": c, "kg": round(kg, 2), "share": round(kg / footprint, 3) if footprint else 0}
            for c, kg in sorted(by_category.items(), key=lambda item: item[1], reverse=True)
        ],
        "reductions": reductions,
        "remaining_kg": round(remaining, 2),
        "offsets": [
            {
                "type": o.name,
                "kind": o.kind,
                "durability": o.durability,
                "price_usd_per_t": list(o.price_usd_per_t),
                "cost_usd": [round(remaining_t * o.price_usd_per_t[0], 2), round(remaining_t * o.price_usd_per_t[1], 2)],
            }
            for o in OFFSET_TYPES
        ],
    }
