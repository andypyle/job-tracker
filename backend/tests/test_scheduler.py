"""
Tests for the nightly jobs: transition_unlikely() and reset_demo_accounts(), against the test
database through the app's pool. Sync tests, so the sql() helper can run its own event loop.
"""
import asyncio
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app import db
from app.services.scheduler import reset_demo_accounts, transition_unlikely
from tests.conftest import make_application, make_demo_user, make_user, sql


def days_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


def run(job) -> None:
    """Run a job the way the scheduler does: with the app's pool open, in its own event loop."""

    async def main():
        await db.open_pool()
        try:
            await job()
        finally:
            await db.close_pool()

    asyncio.run(main())


def failing_pool(method: str) -> MagicMock:
    pool = MagicMock()
    setattr(pool, method, AsyncMock(side_effect=RuntimeError("boom")))
    return pool


def statuses() -> dict[str, str]:
    return {row["company"]: row["status"] for row in sql("SELECT company, status FROM applications")}


def test_transition_unlikely_uses_14_days_without_settings():
    user = make_user()
    make_application(user, company="Fresh", date_applied=days_ago(13))
    make_application(user, company="Stale", date_applied=days_ago(15))
    make_application(user, company="Already interviewing", date_applied=days_ago(40), status="Interviewing")

    run(transition_unlikely)

    assert statuses() == {"Fresh": "Applied", "Stale": "Unlikely", "Already interviewing": "Interviewing"}


def test_transition_unlikely_applies_each_users_cutoff():
    week = make_user("week@example.com")
    month = make_user("month@example.com")
    never = make_user("never@example.com")
    default = make_user("default@example.com")
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, 7), ($2, 30), ($3, NULL), ($4, 14)", week, month, never, default)
    make_application(week, company="Week, 8 days", date_applied=days_ago(8))
    make_application(month, company="Month, 20 days", date_applied=days_ago(20))
    make_application(month, company="Month, 31 days", date_applied=days_ago(31))
    make_application(never, company="Never, 365 days", date_applied=days_ago(365))
    make_application(default, company="Default row, 15 days", date_applied=days_ago(15))

    run(transition_unlikely)

    assert statuses() == {
        "Week, 8 days": "Unlikely",
        "Month, 20 days": "Applied",
        "Month, 31 days": "Unlikely",
        "Never, 365 days": "Applied",
        "Default row, 15 days": "Unlikely",
    }


def test_transition_unlikely_records_automatic_history_for_each_move():
    a, b = make_user("a@example.com"), make_user("b@example.com")
    moved_a = make_application(a, date_applied=days_ago(20))
    moved_b = make_application(b, date_applied=days_ago(20))
    make_application(a, date_applied=days_ago(1))

    run(transition_unlikely)

    history = sql("SELECT application_id, user_id, old_status, new_status, is_automatic FROM application_status_history")
    assert sorted(history, key=lambda row: row["user_id"] == b) == [
        {"application_id": moved_a, "user_id": a, "old_status": "Applied", "new_status": "Unlikely", "is_automatic": True},
        {"application_id": moved_b, "user_id": b, "old_status": "Applied", "new_status": "Unlikely", "is_automatic": True},
    ]


def test_transition_unlikely_is_a_no_op_the_second_time():
    make_application(make_user(), date_applied=days_ago(20))

    run(transition_unlikely)
    run(transition_unlikely)

    assert sql("SELECT count(*) AS n FROM application_status_history")[0]["n"] == 1


def test_transition_unlikely_catches_exceptions():
    with patch("app.services.scheduler.db.pool", return_value=failing_pool("execute")):
        asyncio.run(transition_unlikely())  # logs, doesn't raise


def test_reset_demo_accounts_restores_the_sample_data():
    demo = make_demo_user()
    regular = make_user()
    make_application(demo, company="Added by a visitor")
    make_application(regular, company="Not the demo's")
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, NULL)", demo)

    run(reset_demo_accounts)

    demo_companies = {row["company"] for row in sql("SELECT company FROM applications WHERE user_id = $1", demo)}
    assert len(demo_companies) == 10
    assert "Added by a visitor" not in demo_companies
    assert sql("SELECT count(*) AS n FROM user_settings WHERE user_id = $1", demo)[0]["n"] == 0
    assert sql("SELECT count(*) AS n FROM application_status_history WHERE user_id = $1", demo)[0]["n"] == 20
    # Other users are untouched
    assert sql("SELECT company FROM applications WHERE user_id = $1", regular) == [{"company": "Not the demo's"}]


def test_reset_demo_accounts_catches_exceptions():
    with patch("app.services.scheduler.db.pool", return_value=failing_pool("fetchval")):
        asyncio.run(reset_demo_accounts())  # logs, doesn't raise
