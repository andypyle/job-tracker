import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header

from app.config import get_settings
from app.dependencies import get_current_user
from supabase import Client, create_client

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_admin_client() -> Client:
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _round_or_none(value: Optional[float], ndigits: int = 1) -> Optional[float]:
    if value is None:
        return None
    return round(value, ndigits)


def _parse_dt(s: str) -> datetime:
    """Parse an ISO-8601 datetime string returned by Supabase (handles Z and +00:00)."""
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


@router.get("/timeline")
async def get_timeline_stats(
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    """
    Compute three timeline metrics from application_status_history for the
    authenticated user:

      1. avg_response_days — average days from application creation to first
         status change (any response).
      2. interview_conversion_rate — fraction of applications that reached
         Interviewing at any point.
      3. avg_interview_to_outcome_days — average days from entering Interviewing
         to a final outcome (Offer, Rejected, or Role Eliminated), only where
         the outcome came after the interview started.

    All queries are scoped to user_id extracted from the verified JWT.
    Float results are rounded to 1 decimal place; null when sample size is 0.
    """
    admin_client = _get_admin_client()

    # Fetch all history rows for this user in a single round-trip.
    # We reuse this data for all three metrics to avoid redundant queries.
    try:
        all_rows = (
            admin_client.table("application_status_history")
            .select("application_id, old_status, new_status, changed_at")
            .eq("user_id", user_id)
            .execute()
        ).data or []
    except Exception:
        logger.exception("get_timeline_stats: failed to fetch history for user %s", user_id)
        all_rows = []

    # ------------------------------------------------------------------
    # Metric 1: avg_response_days
    #
    # For each application:
    #   - Creation row: old_status IS NULL — its changed_at is T0.
    #   - First response row: old_status IS NOT NULL, earliest changed_at — T1.
    # Average (T1 - T0) in days across all matched applications.
    # ------------------------------------------------------------------
    avg_response_days: Optional[float] = None
    response_time_n: int = 0
    try:
        creation_times: dict[str, datetime] = {}
        first_response_times: dict[str, datetime] = {}

        for row in all_rows:
            app_id = row["application_id"]
            changed_at = _parse_dt(row["changed_at"])

            if row["old_status"] is None:
                # Creation / initial row — only one per application expected
                creation_times[app_id] = changed_at
            else:
                # Subsequent status change — track the earliest per application
                if app_id not in first_response_times or changed_at < first_response_times[app_id]:
                    first_response_times[app_id] = changed_at

        deltas: list[float] = []
        for app_id, created_at in creation_times.items():
            if app_id in first_response_times:
                delta_seconds = (first_response_times[app_id] - created_at).total_seconds()
                deltas.append(delta_seconds / 86400.0)

        response_time_n = len(deltas)
        if response_time_n > 0:
            avg_response_days = sum(deltas) / response_time_n

    except Exception:
        logger.exception("get_timeline_stats: failed to compute avg_response_days for user %s", user_id)

    # ------------------------------------------------------------------
    # Metric 2: interview_conversion_rate
    #
    # Count distinct applications with any history row (denominator) and how
    # many of those ever had new_status = 'Interviewing' (numerator).
    # ------------------------------------------------------------------
    interview_conversion_rate: Optional[float] = None
    conversion_rate_n: int = 0
    try:
        all_app_ids: set[str] = set()
        interviewed_app_ids: set[str] = set()

        for row in all_rows:
            app_id = row["application_id"]
            all_app_ids.add(app_id)
            if row["new_status"] == "Interviewing":
                interviewed_app_ids.add(app_id)

        conversion_rate_n = len(all_app_ids)
        if conversion_rate_n > 0:
            interview_conversion_rate = len(interviewed_app_ids) / conversion_rate_n

    except Exception:
        logger.exception(
            "get_timeline_stats: failed to compute interview_conversion_rate for user %s", user_id
        )

    # ------------------------------------------------------------------
    # Metric 3: avg_interview_to_outcome_days
    #
    # For each application, find:
    #   - Earliest changed_at where new_status = 'Interviewing' (T_interview).
    #   - Earliest changed_at where new_status IN ('Offer', 'Rejected',
    #     'Role Eliminated') AND changed_at > T_interview (T_outcome).
    # Average (T_outcome - T_interview) in days.
    # ------------------------------------------------------------------
    avg_interview_to_outcome_days: Optional[float] = None
    interview_to_outcome_n: int = 0
    try:
        outcome_statuses = {"Offer", "Rejected", "Role Eliminated"}

        interview_start_times: dict[str, datetime] = {}
        outcome_times: dict[str, datetime] = {}

        for row in all_rows:
            app_id = row["application_id"]
            changed_at = _parse_dt(row["changed_at"])
            status = row["new_status"]

            if status == "Interviewing":
                if app_id not in interview_start_times or changed_at < interview_start_times[app_id]:
                    interview_start_times[app_id] = changed_at
            elif status in outcome_statuses:
                if app_id not in outcome_times or changed_at < outcome_times[app_id]:
                    outcome_times[app_id] = changed_at

        interview_deltas: list[float] = []
        for app_id, started_at in interview_start_times.items():
            if app_id in outcome_times and outcome_times[app_id] > started_at:
                delta_seconds = (outcome_times[app_id] - started_at).total_seconds()
                interview_deltas.append(delta_seconds / 86400.0)

        interview_to_outcome_n = len(interview_deltas)
        if interview_to_outcome_n > 0:
            avg_interview_to_outcome_days = sum(interview_deltas) / interview_to_outcome_n

    except Exception:
        logger.exception(
            "get_timeline_stats: failed to compute avg_interview_to_outcome_days for user %s", user_id
        )

    return {
        "data": {
            "avg_response_days": _round_or_none(avg_response_days),
            "interview_conversion_rate": _round_or_none(interview_conversion_rate),
            "avg_interview_to_outcome_days": _round_or_none(avg_interview_to_outcome_days),
            "sample_sizes": {
                "response_time": response_time_n,
                "conversion_rate": conversion_rate_n,
                "interview_to_outcome": interview_to_outcome_n,
            },
        },
        "error": None,
    }
