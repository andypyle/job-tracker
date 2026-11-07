import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app import db
from app.models.settings import DEFAULT_UNLIKELY_AFTER_DAYS

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

# Moves Applied applications older than their owner's cutoff to Unlikely and records a history
# entry for each, in one statement. The cutoff is user_settings.unlikely_after_days, or $1 (the
# default) for users without a row; a row with NULL means never. A date counts as midnight UTC,
# so with the default 14 days, a run on the 15th moves applications dated the 1st or earlier.
TRANSITION_SQL = """
WITH moved AS (
  UPDATE public.applications a
  SET status = 'Unlikely'
  WHERE a.status = 'Applied'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_settings s WHERE s.user_id = a.user_id AND s.unlikely_after_days IS NULL
    )
    AND a.date_applied <= now() - make_interval(days => COALESCE(
      (SELECT s.unlikely_after_days FROM public.user_settings s WHERE s.user_id = a.user_id), $1
    ))
  RETURNING a.id, a.user_id
)
INSERT INTO public.application_status_history (application_id, user_id, old_status, new_status, is_automatic)
SELECT id, user_id, 'Applied', 'Unlikely', true FROM moved
"""


async def transition_unlikely() -> None:
    """
    Mark Applied applications as Unlikely once they're older than their owner's cutoff
    (user_settings.unlikely_after_days, 14 days by default; null means never), with a status
    history entry for each. A system job: it runs across all users.
    """
    try:
        status = await db.pool().execute(TRANSITION_SQL, DEFAULT_UNLIKELY_AFTER_DAYS)
        # execute() returns the command tag, "INSERT 0 <rows>"
        count = int(status.rsplit(" ", 1)[-1])
        logger.info("auto_unlikely: transitioned %d application(s) to Unlikely", count)
    except Exception:
        logger.exception("auto_unlikely: unexpected error during transition job")


async def reset_demo_accounts() -> None:
    """
    Put the demo account(s) back to the sample data (the reset_demo_data() database function).
    Runs before the Unlikely move, so the demo shows one of those each morning.
    """
    try:
        count = await db.pool().fetchval("SELECT public.reset_demo_data()")
        logger.info("reset_demo: reset %s demo account(s)", count)
    except Exception:
        logger.exception("reset_demo: failed to reset the demo data")


def start_scheduler() -> None:
    """Register the nightly jobs and start the scheduler."""
    scheduler.add_job(
        reset_demo_accounts,
        trigger="cron",
        hour=1,
        minute=30,
        timezone="UTC",
        coalesce=True,
        max_instances=1,
        id="reset_demo",
        replace_existing=True,
    )
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
    logger.info("Scheduler started — reset_demo (01:30 UTC) and auto_unlikely (02:00 UTC) registered")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
