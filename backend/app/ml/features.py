import math
from collections import defaultdict
from datetime import date, timedelta

import numpy as np

CATEGORIES = ["Transport", "Electricity", "Heating", "Food", "Waste", "Water"]
NUM_FEATURES = 5 + len(CATEGORIES)


class UserHistory:
    """Per-day emission totals and category totals for one user."""

    def __init__(self):
        self.totals: dict[date, float] = defaultdict(float)
        self.by_category: dict[date, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def add(self, day: date, category: str, emissions: float):
        self.totals[day] += emissions
        self.by_category[day][category] += emissions

    def first_day(self) -> date | None:
        return min(self.totals) if self.totals else None


def build_histories(activities) -> dict[int, UserHistory]:
    histories: dict[int, UserHistory] = defaultdict(UserHistory)
    for a in activities:
        histories[a.user_id].add(a.activity_date.date(), a.category, float(a.emissions))
    return histories


def features_for_day(history: UserHistory, target_day: date) -> np.ndarray:
    """Features for predicting target_day, using only days strictly before it."""
    last_7 = [history.totals.get(target_day - timedelta(days=i), 0.0) for i in range(1, 8)]
    last_28 = [history.totals.get(target_day - timedelta(days=i), 0.0) for i in range(1, 29)]

    category_sums = defaultdict(float)
    for i in range(1, 29):
        for category, value in history.by_category.get(target_day - timedelta(days=i), {}).items():
            category_sums[category] += value
    window_total = sum(category_sums.values()) or 1.0
    shares = [category_sums[c] / window_total for c in CATEGORIES]

    weekday = target_day.weekday()

    return np.array(
        [
            math.log1p(sum(last_7) / 7),
            math.log1p(sum(last_28) / 28),
            math.log1p(last_7[0]),
            math.sin(2 * math.pi * weekday / 7),
            math.cos(2 * math.pi * weekday / 7),
            *shares,
        ],
        dtype=np.float32,
    )


def build_dataset(histories: dict[int, UserHistory], end_day: date) -> tuple[np.ndarray, np.ndarray]:
    xs, ys = [], []
    for history in histories.values():
        start = history.first_day()
        if start is None:
            continue
        day = start + timedelta(days=7)
        while day <= end_day:
            xs.append(features_for_day(history, day))
            ys.append(math.log1p(history.totals.get(day, 0.0)))
            day += timedelta(days=1)

    if not xs:
        return np.empty((0, NUM_FEATURES), dtype=np.float32), np.empty((0, 1), dtype=np.float32)

    return np.stack(xs), np.array(ys, dtype=np.float32).reshape(-1, 1)
