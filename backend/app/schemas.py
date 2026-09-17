from datetime import datetime

from pydantic import BaseModel


class ActivityCreate(BaseModel):
    user_id: int
    category: str
    activity: str
    quantity: float
    unit: str


class ActivityResponse(BaseModel):
    id: int
    user_id: int
    category: str
    activity: str
    quantity: float
    unit: str
    emissions: float
    activity_date: datetime

    class Config:
        from_attributes = True