import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def transition_unlikely() -> None:
    """
    Mark Applied applications older than 14 days as Unlikely.
    Uses service role key to bypass RLS — this is an intentional system job.
    Also records a status history entry for each transitioned application.
    """
    try:
        settings = get_settings()
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=14)
        cutoff_str = cutoff.isoformat()

        result = (
            client.table("applications")
            .update({"status": "Unlikely"})
            .eq("status", "Applied")
            .lte("date_applied", cutoff_str)
            .execute()
        )

        updated_rows = result.data or []
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
