import logging
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import func

from app import grid, push
from app.database import SessionLocal
from app.models import Activity, PushSubscription

logger = logging.getLogger(__name__)


def _logged_today_kg(db, user_id: int, zone: ZoneInfo) -> float | None:
    local_midnight = datetime.combine(datetime.now(zone).date(), time.min, tzinfo=zone)
    start_utc = local_midnight.astimezone(timezone.utc).replace(tzinfo=None)
    total = (
        db.query(func.sum(Activity.emissions))
        .filter(
            Activity.user_id == user_id,
            Activity.activity_date >= start_utc,
            Activity.activity_date < start_utc + timedelta(days=1),
        )
        .scalar()
    )
    return float(total) if total is not None else None


def send_due_reminders():
    db = SessionLocal()
    try:
        subscriptions = (
            db.query(PushSubscription).filter(PushSubscription.daily_reminder.is_(True)).all()
        )
        reminded_users: set[int] = set()

        for subscription in subscriptions:
            zone = ZoneInfo(subscription.timezone)
            local_now = datetime.now(zone)
            if local_now.strftime("%H:%M") < subscription.reminder_time:
                continue
            if subscription.last_sent_on == local_now.date():
                continue

            subscription.last_sent_on = local_now.date()
            db.commit()

            # send_to_user already fans out to all of a user's devices.
            if subscription.user_id in reminded_users:
                continue
            reminded_users.add(subscription.user_id)

            logged = _logged_today_kg(db, subscription.user_id, zone)
            if logged is None:
                body = "You haven't logged anything today. It only takes 30 seconds."
            else:
                body = f"{logged:.1f} kg CO₂e logged today. Anything else to add?"

            push.send_to_user(
                db,
                subscription.user_id,
                title="Time to log your day",
                body=body,
                notification_type="reminder",
            )
    except Exception:
        logger.exception("Reminder job failed")
    finally:
        db.close()


def poll_grid_intensity():
    if grid.api_key() is None:
        return
    db = SessionLocal()
    try:
        stored = grid.poll(db, include_history=not grid.has_readings(db))
        logger.info("Stored %d grid intensity readings for %s", stored, grid.zone())
    except Exception:
        logger.exception("Grid intensity poll failed")
    finally:
        db.close()


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(send_due_reminders, "interval", minutes=1, id="daily_reminders")
    scheduler.add_job(
        poll_grid_intensity,
        "interval",
        minutes=15,
        id="grid_intensity",
        next_run_time=datetime.now(),
    )
    return scheduler
