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

        updated_count = len(result.data) if result.data else 0
        logger.info("auto_unlikely: transitioned %d application(s) to Unlikely", updated_count)

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
