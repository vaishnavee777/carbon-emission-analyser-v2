from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import push
from app.auth import get_current_user
from app.database import get_db
from app.models import Notification, PushSubscription, User
from app.schemas import (
    NotificationResponse,
    SubscribeRequest,
    UnsubscribeRequest,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("/vapid-public-key")
def get_vapid_public_key():
    return {"public_key": push.vapid_public_key()}


@router.post("/subscribe")
def subscribe(
    request: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        zone = ZoneInfo(request.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=400, detail="Unknown timezone.")

    subscription = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == request.subscription.endpoint)
        .first()
    )
    if subscription is None:
        subscription = PushSubscription(endpoint=request.subscription.endpoint)
        db.add(subscription)

    subscription.user_id = user.id
    subscription.p256dh = request.subscription.keys.p256dh
    subscription.auth = request.subscription.keys.auth
    subscription.timezone = request.timezone
    subscription.daily_reminder = request.daily_reminder

    # Don't fire immediately if today's reminder time has already passed.
    local_now = datetime.now(zone)
    if subscription.reminder_time != request.reminder_time or subscription.last_sent_on is None:
        subscription.last_sent_on = (
            local_now.date() if local_now.strftime("%H:%M") >= request.reminder_time else None
        )
    subscription.reminder_time = request.reminder_time

    db.commit()
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe(
    request: UnsubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == request.endpoint,
        PushSubscription.user_id == user.id,
    ).delete()
    db.commit()
    return {"status": "unsubscribed"}


@router.post("/test")
def send_test(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    delivered = push.send_to_user(
        db,
        user.id,
        title="Carbon check-in",
        body="Notifications are working. We'll remind you to log your day.",
        notification_type="system",
    )
    if delivered == 0:
        raise HTTPException(status_code=404, detail="No active push subscription for this user.")
    return {"delivered": delivered}


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
