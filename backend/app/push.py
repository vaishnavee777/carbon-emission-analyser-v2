import json
import os

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.models import Notification, PushSubscription


def vapid_public_key() -> str:
    key = os.getenv("VAPID_PUBLIC_KEY")
    if not key:
        raise RuntimeError("VAPID_PUBLIC_KEY is not set. Run `python -m app.generate_vapid`.")
    return key


def send_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str,
    url: str = "/log",
) -> int:
    """Store the notification and push it to every subscribed device. Returns devices reached."""
    db.add(Notification(user_id=user_id, message=body, notification_type=notification_type))

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    delivered = 0
    payload = json.dumps({"title": title, "body": body, "url": url})

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
                vapid_claims={"sub": os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")},
            )
            delivered += 1
        except WebPushException as error:
            # 404/410 mean the browser revoked this subscription for good.
            if error.response is not None and error.response.status_code in (404, 410):
                db.delete(subscription)

    db.commit()
    return delivered
