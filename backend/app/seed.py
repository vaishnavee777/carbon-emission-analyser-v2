"""
Seeds the database with realistic sample data for local development / demos.

Run with:
    python -m app.seed
"""

import hashlib
import random
from datetime import date, datetime, timedelta

from app.database import Base, SessionLocal, engine
from app.models import (
    Activity,
    DailyEmission,
    EmissionFactor,
    Notification,
    Prediction,
    User,
    UserGoal,
)

random.seed(42)

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Ishaan", "Arjun", "Kabir", "Reyansh", "Sai",
    "Krishna", "Rohan", "Ananya", "Diya", "Saanvi", "Aadhya", "Myra", "Pari",
    "Anika", "Navya", "Riya", "Kiara", "Emma", "Olivia", "Liam", "Noah",
    "Ava", "Sophia", "Mason", "Lucas", "Mia", "Ethan", "James", "Amelia",
    "Benjamin", "Charlotte", "Henry", "Grace", "Daniel", "Zoe", "Leo", "Isla",
    "Nikhil", "Priya", "Rahul", "Sneha", "Karan", "Pooja", "Arnav", "Meera",
    "Vikram", "Tara",
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Iyer", "Nair", "Rao", "Khan", "Mehta",
    "Kapoor", "Bhatt", "Smith", "Johnson", "Williams", "Brown", "Jones",
    "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Patel", "Reddy",
    "Chopra", "Malhotra", "Singh",
]

# category, activity, unit, factor (kg CO2e per unit), source
EMISSION_FACTORS = [
    ("Transport", "Car (Petrol)", "km", 0.192, "DEFRA 2024"),
    ("Transport", "Car (Diesel)", "km", 0.171, "DEFRA 2024"),
    ("Transport", "Car (Electric)", "km", 0.053, "DEFRA 2024"),
    ("Transport", "Motorcycle", "km", 0.113, "DEFRA 2024"),
    ("Transport", "Bus", "km", 0.105, "DEFRA 2024"),
    ("Transport", "Train", "km", 0.041, "DEFRA 2024"),
    ("Transport", "Metro/Subway", "km", 0.028, "DEFRA 2024"),
    ("Transport", "Flight (Domestic)", "km", 0.246, "IPCC 2023"),
    ("Transport", "Flight (International)", "km", 0.195, "IPCC 2023"),
    ("Transport", "Bicycle", "km", 0.0, "IPCC 2023"),
    ("Transport", "Walking", "km", 0.0, "IPCC 2023"),
    ("Transport", "Ride Share", "km", 0.15, "EPA 2024"),
    ("Electricity", "Grid Electricity", "kWh", 0.475, "IEA 2024"),
    ("Electricity", "Solar (Self-generated)", "kWh", 0.041, "IEA 2024"),
    ("Heating", "Natural Gas", "m3", 2.03, "EPA 2024"),
    ("Heating", "LPG", "kg", 2.983, "EPA 2024"),
    ("Heating", "Heating Oil", "liter", 2.52, "EPA 2024"),
    ("Food", "Beef", "kg", 27.0, "Poore & Nemecek 2018"),
    ("Food", "Lamb", "kg", 24.5, "Poore & Nemecek 2018"),
    ("Food", "Pork", "kg", 7.2, "Poore & Nemecek 2018"),
    ("Food", "Chicken", "kg", 6.1, "Poore & Nemecek 2018"),
    ("Food", "Fish", "kg", 5.4, "Poore & Nemecek 2018"),
    ("Food", "Dairy (Milk)", "liter", 3.2, "Poore & Nemecek 2018"),
    ("Food", "Eggs", "kg", 4.5, "Poore & Nemecek 2018"),
    ("Food", "Rice", "kg", 4.0, "Poore & Nemecek 2018"),
    ("Food", "Vegetables", "kg", 0.4, "Poore & Nemecek 2018"),
    ("Food", "Fruits", "kg", 0.5, "Poore & Nemecek 2018"),
    ("Waste", "Landfill Waste", "kg", 0.58, "EPA 2024"),
    ("Waste", "Recycled Waste", "kg", 0.02, "EPA 2024"),
    ("Waste", "Composted Waste", "kg", 0.01, "EPA 2024"),
    ("Water", "Water Usage", "liter", 0.000344, "Water UK 2023"),
]

GOAL_PERIODS = ["weekly", "monthly", "yearly"]

NOTIFICATION_TEMPLATES = [
    ("goal", "You're on track to meet your {period} emissions goal."),
    ("goal", "Warning: you're close to exceeding your {period} emissions goal."),
    ("goal", "You exceeded your {period} emissions goal. Consider adjusting your habits."),
    ("prediction", "Your predicted emissions for next month are trending upward."),
    ("prediction", "Great job! Your predicted emissions are trending downward."),
    ("activity", "New activity logged and emissions calculated."),
    ("system", "New emission factors have been added to the database."),
    ("system", "Your weekly carbon footprint summary is ready."),
    ("tip", "Tip: switching to public transport could cut your transport emissions significantly."),
    ("tip", "Tip: reducing red meat consumption lowers your food-related emissions."),
]

TARGET_TOTAL_RECORDS = 4000
NUM_USERS = 50
NUM_ACTIVITIES = 1750
NUM_PREDICTIONS_PER_USER = (3, 8)
NUM_GOALS_PER_USER = (0, 2)
NUM_NOTIFICATIONS_PER_USER = (3, 8)

TODAY = date.today()


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def random_past_datetime(days_back: int) -> datetime:
    offset_days = random.randint(0, days_back)
    offset_seconds = random.randint(0, 86_399)
    return datetime.utcnow() - timedelta(days=offset_days, seconds=-offset_seconds)


def seed_users(db) -> list[User]:
    users = []
    used_emails = set()

    for i in range(NUM_USERS):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"

        email = f"{first.lower()}.{last.lower()}{i}@example.com"
        while email in used_emails:
            email = f"{first.lower()}.{last.lower()}{i}.{random.randint(1, 999)}@example.com"
        used_emails.add(email)

        user = User(
            name=name,
            email=email,
            password=hash_password("Password123!"),
            created_at=random_past_datetime(365),
        )
        users.append(user)

    db.add_all(users)
    db.commit()

    for user in users:
        db.refresh(user)

    return users


def seed_emission_factors(db) -> list[EmissionFactor]:
    factors = [
        EmissionFactor(
            category=category,
            activity=activity,
            unit=unit,
            factor=factor,
            source=source,
            created_at=random_past_datetime(400),
        )
        for category, activity, unit, factor, source in EMISSION_FACTORS
    ]

    db.add_all(factors)
    db.commit()

    for factor in factors:
        db.refresh(factor)

    return factors


def seed_activities(db, users: list[User], factors: list[EmissionFactor]) -> list[Activity]:
    activities = []

    for _ in range(NUM_ACTIVITIES):
        user = random.choice(users)
        factor = random.choice(factors)

        if factor.category == "Transport":
            quantity = round(random.uniform(1, 80), 2)
        elif factor.category == "Electricity":
            quantity = round(random.uniform(1, 40), 2)
        elif factor.category == "Heating":
            quantity = round(random.uniform(1, 30), 2)
        elif factor.category == "Food":
            quantity = round(random.uniform(0.1, 5), 2)
        elif factor.category == "Waste":
            quantity = round(random.uniform(0.5, 10), 2)
        else:
            quantity = round(random.uniform(10, 300), 2)

        emissions = round(quantity * float(factor.factor), 4)
        activity_date = datetime.utcnow() - timedelta(
            days=random.randint(0, 180),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

        activities.append(
            Activity(
                user_id=user.id,
                emission_factor_id=factor.id,
                category=factor.category,
                activity=factor.activity,
                quantity=quantity,
                unit=factor.unit,
                emissions=emissions,
                activity_date=activity_date,
            )
        )

    db.add_all(activities)
    db.commit()

    for activity in activities:
        db.refresh(activity)

    return activities


def seed_daily_emissions(db, activities: list[Activity]) -> list[DailyEmission]:
    totals: dict[tuple[int, date], float] = {}

    for activity in activities:
        key = (activity.user_id, activity.activity_date.date())
        totals[key] = totals.get(key, 0.0) + float(activity.emissions)

    daily_emissions = [
        DailyEmission(
            user_id=user_id,
            emission_date=emission_date,
            total_emissions=round(total, 4),
            created_at=datetime.combine(emission_date, datetime.min.time()) + timedelta(hours=23),
        )
        for (user_id, emission_date), total in totals.items()
    ]

    db.add_all(daily_emissions)
    db.commit()

    for record in daily_emissions:
        db.refresh(record)

    return daily_emissions


def seed_predictions(db, users: list[User], daily_emissions: list[DailyEmission]) -> list[Prediction]:
    by_user: dict[int, list[DailyEmission]] = {}
    for record in daily_emissions:
        by_user.setdefault(record.user_id, []).append(record)

    predictions = []

    for user in users:
        history = by_user.get(user.id, [])
        baseline = (
            sum(float(r.total_emissions) for r in history) / len(history)
            if history
            else round(random.uniform(2, 20), 2)
        )

        count = random.randint(*NUM_PREDICTIONS_PER_USER)
        for i in range(1, count + 1):
            predicted_date = TODAY + timedelta(days=i * 7)
            variation = random.uniform(-0.25, 0.25)
            predicted_emissions = max(0.0, round(baseline * (1 + variation), 4))

            predictions.append(
                Prediction(
                    user_id=user.id,
                    predicted_date=predicted_date,
                    predicted_emissions=predicted_emissions,
                    model_used=random.choice(
                        ["linear_regression", "moving_average", "arima"]
                    ),
                    confidence_score=round(random.uniform(0.55, 0.97), 4),
                    created_at=random_past_datetime(30),
                )
            )

    db.add_all(predictions)
    db.commit()

    return predictions


def seed_user_goals(db, users: list[User]) -> list[UserGoal]:
    goals = []

    for user in users:
        count = random.randint(*NUM_GOALS_PER_USER)
        for _ in range(count):
            period = random.choice(GOAL_PERIODS)
            start_offset = random.randint(0, 60)
            start_date = TODAY - timedelta(days=start_offset)

            if period == "weekly":
                end_date = start_date + timedelta(days=7)
                target = round(random.uniform(20, 60), 2)
            elif period == "monthly":
                end_date = start_date + timedelta(days=30)
                target = round(random.uniform(80, 250), 2)
            else:
                end_date = start_date + timedelta(days=365)
                target = round(random.uniform(1000, 3000), 2)

            goals.append(
                UserGoal(
                    user_id=user.id,
                    target_emissions=target,
                    period=period,
                    start_date=start_date,
                    end_date=end_date,
                    is_active=end_date >= TODAY,
                    created_at=datetime.combine(start_date, datetime.min.time()),
                )
            )

    db.add_all(goals)
    db.commit()

    return goals


def seed_notifications(db, users: list[User]) -> list[Notification]:
    notifications = []

    for user in users:
        count = random.randint(*NUM_NOTIFICATIONS_PER_USER)
        for _ in range(count):
            notif_type, template = random.choice(NOTIFICATION_TEMPLATES)
            message = template.format(period=random.choice(GOAL_PERIODS))

            notifications.append(
                Notification(
                    user_id=user.id,
                    message=message,
                    notification_type=notif_type,
                    is_read=random.random() < 0.6,
                    created_at=random_past_datetime(90),
                )
            )

    db.add_all(notifications)
    db.commit()

    return notifications


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(
                f"Database already has {existing_users} users. "
                "Skipping seed to avoid duplicate data."
            )
            return

        print("Seeding users...")
        users = seed_users(db)

        print("Seeding emission factors...")
        factors = seed_emission_factors(db)

        print("Seeding activities...")
        activities = seed_activities(db, users, factors)

        print("Seeding daily emissions...")
        daily_emissions = seed_daily_emissions(db, activities)

        print("Seeding predictions...")
        predictions = seed_predictions(db, users, daily_emissions)

        print("Seeding user goals...")
        goals = seed_user_goals(db, users)

        print("Seeding notifications...")
        notifications = seed_notifications(db, users)

        total = (
            len(users)
            + len(factors)
            + len(activities)
            + len(daily_emissions)
            + len(predictions)
            + len(goals)
            + len(notifications)
        )

        print("\nSeed complete:")
        print(f"  users:            {len(users)}")
        print(f"  emission_factors: {len(factors)}")
        print(f"  activities:       {len(activities)}")
        print(f"  daily_emissions:  {len(daily_emissions)}")
        print(f"  predictions:      {len(predictions)}")
        print(f"  user_goals:       {len(goals)}")
        print(f"  notifications:    {len(notifications)}")
        print(f"  TOTAL:            {total}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
