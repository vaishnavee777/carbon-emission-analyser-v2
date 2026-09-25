from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    UniqueConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    activities: Mapped[list["Activity"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    daily_emissions: Mapped[list["DailyEmission"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    goals: Mapped[list["UserGoal"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    activity: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    factor: Mapped[float] = mapped_column(
        Numeric(10, 6),
        nullable=False,
    )

    source: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    activities: Mapped[list["Activity"]] = relationship(
        back_populates="emission_factor",
    )


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    emission_factor_id: Mapped[int | None] = mapped_column(
        ForeignKey("emission_factors.id"),
        nullable=True,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    activity: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    emissions: Mapped[float] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    # gCO2e/kWh used for grid electricity rows; null means the static factor.
    grid_intensity: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )

    activity_date: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user: Mapped["User"] = relationship(
        back_populates="activities",
    )

    emission_factor: Mapped["EmissionFactor | None"] = relationship(
        back_populates="activities",
    )


class DailyEmission(Base):
    __tablename__ = "daily_emissions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    emission_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    total_emissions: Mapped[float] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user: Mapped["User"] = relationship(
        back_populates="daily_emissions",
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    predicted_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    predicted_emissions: Mapped[float] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    model_used: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    confidence_score: Mapped[float] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user: Mapped["User"] = relationship(
        back_populates="predictions",
    )


class UserGoal(Base):
    __tablename__ = "user_goals"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    target_emissions: Mapped[float] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    period: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user: Mapped["User"] = relationship(
        back_populates="goals",
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notification_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    user: Mapped["User"] = relationship(
        back_populates="notifications",
    )

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    endpoint: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        nullable=False,
    )

    p256dh: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    auth: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    reminder_time: Mapped[str] = mapped_column(
        String(5),
        default="20:00",
    )

    timezone: Mapped[str] = mapped_column(
        String(64),
        default="UTC",
    )

    daily_reminder: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    last_sent_on: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


class GridIntensityReading(Base):
    __tablename__ = "grid_intensity_readings"
    __table_args__ = (
        UniqueConstraint("zone", "measured_at", name="uq_grid_zone_measured_at"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    zone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    carbon_intensity: Mapped[float] = mapped_column(
        Numeric(8, 2),
        nullable=False,
    )

    is_estimated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    measured_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # SHA-256 of the cookie token; the raw token is never stored.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    last_used_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    user: Mapped["User"] = relationship()


class Trip(Base):
    """Summary of a GPS-tracked trip. The raw GPS track never leaves the device."""

    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    distance_km: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    median_speed_kmh: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    p95_speed_kmh: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    speed_cv: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    stop_fraction: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False)
    walking_motion_fraction: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    sample_count: Mapped[int] = mapped_column(nullable=False)

    detected_mode: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    # What the user confirmed; detected vs confirmed pairs are labelled training data for a future classifier.
    confirmed_mode: Mapped[str | None] = mapped_column(String(100), nullable=True)

    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
