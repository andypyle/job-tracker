"""Tests for /applications CRUD routes, against the test database."""
from unittest.mock import AsyncMock, patch

from tests.conftest import make_application, make_user, sql

MISSING_ID = "00000000-0000-4000-8000-00000000abcd"


# ---------------------------------------------------------------------------
# GET /applications
# ---------------------------------------------------------------------------


def test_list_applications_returns_only_the_users_rows_newest_first(client, user_id):
    older = make_application(user_id, company="Older", date_applied="2026-09-01")
    newer = make_application(user_id, company="Newer", date_applied="2026-10-01")
    make_application(make_user("other@example.com"), company="Someone else's")

    resp = client.get("/applications")

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert [row["id"] for row in body["data"]] == [newer, older]
    assert body["data"][0]["user_id"] == user_id
    assert body["data"][0]["date_applied"] == "2026-10-01"
    assert body["data"][0]["status"] == "Applied"


def test_list_applications_filters_by_status(client, user_id):
    make_application(user_id, company="Applied Co")
    interviewing = make_application(user_id, company="Interview Co", status="Interviewing")

    resp = client.get("/applications", params={"status": "Interviewing"})

    assert resp.status_code == 200
    assert [row["id"] for row in resp.json()["data"]] == [interviewing]


def test_list_applications_rejects_unknown_status(client):
    assert client.get("/applications", params={"status": "Ghosted"}).status_code == 422


# ---------------------------------------------------------------------------
# GET /applications/{id}
# ---------------------------------------------------------------------------


def test_get_application_includes_history_and_signed_urls(client, user_id):
    app_id = make_application(user_id, resume_path=f"{user_id}/x/resume.pdf")
    sql(
        "INSERT INTO application_status_history (application_id, user_id, old_status, new_status) VALUES ($1, $2, NULL, 'Applied')",
        app_id,
        user_id,
    )

    with patch("app.routers.applications.get_signed_url", new_callable=AsyncMock, return_value="https://signed") as sign:
        resp = client.get(f"/applications/{app_id}")

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["resume_url"] == "https://signed"
    assert data["cover_letter_url"] is None
    sign.assert_awaited_once_with(f"{user_id}/x/resume.pdf")
    assert [(h["old_status"], h["new_status"]) for h in data["status_history"]] == [(None, "Applied")]


def test_get_application_not_found(client):
    assert client.get(f"/applications/{MISSING_ID}").status_code == 404


def test_get_application_with_malformed_id_is_not_found(client):
    assert client.get("/applications/not-a-uuid").status_code == 404


def test_get_application_of_another_user_is_not_found(client):
    other = make_application(make_user("other@example.com"))
    assert client.get(f"/applications/{other}").status_code == 404
    assert client.get(f"/applications/{other}/history").status_code == 404


# ---------------------------------------------------------------------------
# POST /applications
# ---------------------------------------------------------------------------

NEW_APPLICATION = {"job_title": "Software Engineer", "company": "Acme", "date_applied": "2026-04-01"}


def test_create_application_defaults_status_to_applied_and_records_creation(client, user_id):
    resp = client.post("/applications", json=NEW_APPLICATION)

    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["status"] == "Applied"
    assert data["user_id"] == user_id
    assert data["resume_url"] is None
    assert [(h["old_status"], h["new_status"], h["is_automatic"]) for h in data["status_history"]] == [
        (None, "Applied", False)
    ]


def test_create_application_accepts_status(client):
    resp = client.post("/applications", json={**NEW_APPLICATION, "status": "Interviewing"})

    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["status"] == "Interviewing"
    assert data["status_history"][0]["new_status"] == "Interviewing"


def test_create_application_rejects_unknown_status(client):
    assert client.post("/applications", json={**NEW_APPLICATION, "status": "Ghosted"}).status_code == 422


def test_create_application_takes_user_id_from_the_jwt_not_the_body(client, user_id):
    other = make_user("other@example.com")

    resp = client.post("/applications", json={**NEW_APPLICATION, "user_id": other})

    assert resp.status_code == 201
    assert resp.json()["data"]["user_id"] == user_id
    assert sql("SELECT count(*) AS n FROM applications WHERE user_id = $1", other)[0]["n"] == 0


# ---------------------------------------------------------------------------
# PATCH /applications/{id}
# ---------------------------------------------------------------------------


def test_update_application_changes_only_the_fields_sent(client, user_id):
    app_id = make_application(user_id, company="Acme", notes="keep me")

    resp = client.patch(f"/applications/{app_id}", json={"company": "Acme Corp"})

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["company"] == "Acme Corp"
    assert data["notes"] == "keep me"
    # No status change, no history
    assert sql("SELECT count(*) AS n FROM application_status_history")[0]["n"] == 0


def test_update_application_records_a_status_change(client, user_id):
    app_id = make_application(user_id)

    resp = client.patch(f"/applications/{app_id}", json={"status": "Interviewing"})

    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "Interviewing"
    history = sql("SELECT old_status, new_status, is_automatic FROM application_status_history WHERE application_id = $1", app_id)
    assert history == [{"old_status": "Applied", "new_status": "Interviewing", "is_automatic": False}]


def test_update_application_to_the_same_status_records_nothing(client, user_id):
    app_id = make_application(user_id)

    assert client.patch(f"/applications/{app_id}", json={"status": "Applied"}).status_code == 200
    assert sql("SELECT count(*) AS n FROM application_status_history")[0]["n"] == 0


def test_update_application_can_clear_a_field(client, user_id):
    app_id = make_application(user_id, notes="old")

    resp = client.patch(f"/applications/{app_id}", json={"notes": None})

    assert resp.json()["data"]["notes"] is None


def test_update_application_needs_a_field(client, user_id):
    app_id = make_application(user_id)
    assert client.patch(f"/applications/{app_id}", json={}).status_code == 400


def test_update_application_returns_404_for_wrong_user(client):
    other = make_application(make_user("other@example.com"), company="Theirs")

    resp = client.patch(f"/applications/{other}", json={"company": "Mine now", "status": "Offer"})

    assert resp.status_code == 404
    assert sql("SELECT company, status::text FROM applications WHERE id = $1", other) == [
        {"company": "Theirs", "status": "Applied"}
    ]
    assert sql("SELECT count(*) AS n FROM application_status_history")[0]["n"] == 0


# ---------------------------------------------------------------------------
# DELETE /applications/{id}
# ---------------------------------------------------------------------------


def test_delete_application_cleans_up_files_and_history(client, user_id):
    app_id = make_application(user_id, resume_path="u/a/resume.pdf", cover_letter_path="u/a/cover_letter.pdf")
    sql(
        "INSERT INTO application_status_history (application_id, user_id, new_status) VALUES ($1, $2, 'Applied')",
        app_id,
        user_id,
    )

    with patch("app.routers.applications.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete(f"/applications/{app_id}")

    assert resp.status_code == 204
    assert [c.args[0] for c in delete_file.await_args_list] == ["u/a/resume.pdf", "u/a/cover_letter.pdf"]
    assert sql("SELECT count(*) AS n FROM applications")[0]["n"] == 0
    assert sql("SELECT count(*) AS n FROM application_status_history")[0]["n"] == 0


def test_delete_application_of_another_user_is_not_found(client):
    other = make_application(make_user("other@example.com"))

    with patch("app.routers.applications.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete(f"/applications/{other}")

    assert resp.status_code == 404
    delete_file.assert_not_awaited()
    assert sql("SELECT count(*) AS n FROM applications")[0]["n"] == 1
