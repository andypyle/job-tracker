"""Tests for GET /stats/timeline: it counts only the signed-in user's applications and history."""
from datetime import datetime

from tests.conftest import make_application, make_user, sql


def _history(app_id: str, user_id: str, old: str | None, new: str, at: str) -> None:
    sql(
        """
        INSERT INTO application_status_history (application_id, user_id, old_status, new_status, changed_at)
        VALUES ($1, $2, $3::application_status, $4::application_status, $5)
        """,
        app_id,
        user_id,
        old,
        new,
        datetime.fromisoformat(at),
    )


def test_timeline_counts_only_the_users_own_rows(client, user_id):
    # Mine: applied, heard back 2 days later, rejected 4 days after that
    mine = make_application(user_id, status="Rejected")
    _history(mine, user_id, None, "Applied", "2026-10-01T00:00:00Z")
    _history(mine, user_id, "Applied", "Interviewing", "2026-10-03T00:00:00Z")
    _history(mine, user_id, "Interviewing", "Rejected", "2026-10-07T00:00:00Z")

    # Someone else's: two applications with very different timings, which would move every metric
    other = make_user("other@example.com")
    for _ in range(2):
        theirs = make_application(other, status="Offer")
        _history(theirs, other, None, "Applied", "2026-09-01T00:00:00Z")
        _history(theirs, other, "Applied", "Interviewing", "2026-09-21T00:00:00Z")
        _history(theirs, other, "Interviewing", "Offer", "2026-10-21T00:00:00Z")
    make_application(other)  # and one with no history at all

    resp = client.get("/stats/timeline")

    assert resp.status_code == 200
    assert resp.json()["data"] == {
        "avg_response_days": 2.0,
        "interview_conversion_rate": 1.0,
        "avg_interview_to_outcome_days": 4.0,
        "sample_sizes": {"response_time": 1, "conversion_rate": 1, "interview_to_outcome": 1},
    }


def test_timeline_is_empty_when_only_other_users_have_data(client):
    other = make_user("other@example.com")
    theirs = make_application(other, status="Interviewing")
    _history(theirs, other, None, "Applied", "2026-10-01T00:00:00Z")
    _history(theirs, other, "Applied", "Interviewing", "2026-10-03T00:00:00Z")

    assert client.get("/stats/timeline").json()["data"] == {
        "avg_response_days": None,
        "interview_conversion_rate": None,
        "avg_interview_to_outcome_days": None,
        "sample_sizes": {"response_time": 0, "conversion_rate": 0, "interview_to_outcome": 0},
    }
