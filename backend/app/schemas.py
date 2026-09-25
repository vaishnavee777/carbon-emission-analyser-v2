from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, EmailStr, Field, field_validator


class ActivityCreate(BaseModel):
    category: str
    activity: str
    quantity: float = Field(gt=0)
    unit: str
    # When it happened; defaults to now. Stored as naive UTC.
    activity_date: datetime | None = None

    @field_validator("activity_date")
    @classmethod
    def past_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        now = datetime.utcnow()
        if value > now + timedelta(minutes=5):
            raise ValueError("Activity time can't be in the future.")
        if value < now - timedelta(days=365):
            raise ValueError("Activity time must be within the last year.")
        return value


class ActivityResponse(BaseModel):
    id: int
    user_id: int
    category: str
    activity: str
    quantity: float
    unit: str
    emissions: float
    grid_intensity: float | None = None
    activity_date: datetime

    class Config:
        from_attributes = True

class EmissionFactorResponse(BaseModel):
    id: int
    category: str
    activity: str
    unit: str
    factor: float

    class Config:
        from_attributes = True


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionPayload(BaseModel):
    endpoint: str
    keys: PushKeys


class SubscribeRequest(BaseModel):
    subscription: PushSubscriptionPayload
    reminder_time: str = Field(default="20:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    timezone: str = "UTC"
    daily_reminder: bool = True


class UnsubscribeRequest(BaseModel):
    endpoint: str


class NotificationResponse(BaseModel):
    id: int
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class TripCreate(BaseModel):
    started_at: datetime
    ended_at: datetime
    distance_km: float = Field(ge=0, le=5000)
    median_speed_kmh: float = Field(ge=0, le=1200)
    p95_speed_kmh: float = Field(ge=0, le=1200)
    speed_cv: float = Field(ge=0, le=10)
    stop_fraction: float = Field(ge=0, le=1)
    walking_motion_fraction: float | None = Field(default=None, ge=0, le=1)
    sample_count: int = Field(ge=0)


class TripConfirm(BaseModel):
    activity: str
