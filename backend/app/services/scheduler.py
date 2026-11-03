import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client

from app.config import get_settings
from app.models.settings import DEFAULT_UNLIKELY_AFTER_DAYS

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def group_users_by_cutoff(rows: list[dict]) -> tuple[dict[int, list[str]], list[str]]:
    """
    Splits user_settings rows into the users whose cutoff differs from the default, grouped by
    days, and the users who turned the move off (unlikely_after_days is null). Everyone else,
    including users with no row, gets the default.
    """
    custom: dict[int, list[str]] = {}
    never: list[str] = []
    for row in rows:
        days = row.get("unlikely_after_days")
        if days is None:
            never.append(row["user_id"])
        elif days != DEFAULT_UNLIKELY_AFTER_DAYS:
            custom.setdefault(days, []).append(row["user_id"])
    return custom, never


async def transition_unlikely() -> None:
    """
    Mark Applied applications as Unlikely once they're older than their owner's cutoff
    (user_settings.unlikely_after_days, 14 days by default; null means never).
    Uses service role key to bypass RLS — this is an intentional system job.
    Also records a status history entry for each transitioned application.
    """
    try:
        settings = get_settings()
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # Without the settings we can't tell who opted out, so skip the run rather than guess
        try:
            settings_rows = (
                client.table("user_settings").select("user_id, unlikely_after_days").execute()
            ).data or []
        except Exception:
            logger.exception("auto_unlikely: failed to read user settings; skipping this run")
            return

        custom, never = group_users_by_cutoff(settings_rows)
        now = datetime.now(tz=timezone.utc)

        def cutoff(days: int) -> str:
            return (now - timedelta(days=days)).isoformat()

        def applied_before(days: int):
            return (
                client.table("applications")
                .update({"status": "Unlikely"})
                .eq("status", "Applied")
                .lte("date_applied", cutoff(days))
            )

        updated_rows: list[dict] = []

        # Everyone on the default: users without a row, or whose row matches the default
        not_default = never + [user_id for ids in custom.values() for user_id in ids]
        query = applied_before(DEFAULT_UNLIKELY_AFTER_DAYS)
        if not_default:
            query = query.not_.in_("user_id", not_default)
        updated_rows += query.execute().data or []

        # One update per custom cutoff
        for days, user_ids in sorted(custom.items()):
            updated_rows += applied_before(days).in_("user_id", user_ids).execute().data or []

        updated_count = len(updated_rows)
        logger.info("auto_unlikely: transitioned %d application(s) to Unlikely", updated_count)

        # Insert a history row for each transitioned application
        if updated_rows:
            history_entries = [
                {
                    "application_id": row["id"],
                    "user_id": row["user_id"],
                    "old_status": "Applied",
                    "new_status": "Unlikely",
                    "is_automatic": True,
                }
                for row in updated_rows
            ]
            try:
                client.table("application_status_history").insert(history_entries).execute()
                logger.info("auto_unlikely: inserted %d status history row(s)", len(history_entries))
            except Exception:
                logger.exception("auto_unlikely: failed to insert status history rows")

    except Exception:
        logger.exception("auto_unlikely: unexpected error during transition job")


def start_scheduler() -> None:
    """Register the transition_unlikely job and start the scheduler."""
    scheduler.add_job(
        transition_unlikely,
        trigger="cron",
        hour=2,
        minute=0,
        timezone="UTC",
        coalesce=True,
        max_instances=1,
        id="auto_unlikely",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — auto_unlikely job registered (daily at 02:00 UTC)")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
