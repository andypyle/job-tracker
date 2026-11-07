"""Tests for GET and DELETE /account."""
from unittest.mock import AsyncMock, call, patch

from app.dependencies import get_current_user
from app.main import app
from tests.conftest import make_application, make_demo_user, make_user, sql


def test_get_account_for_a_regular_user(client):
    assert client.get("/account").json() == {"data": {"is_demo": False}, "error": None}


def test_get_account_for_the_demo(client):
    demo_id = make_demo_user()
    app.dependency_overrides[get_current_user] = lambda: demo_id

    assert client.get("/account").json() == {"data": {"is_demo": True}, "error": None}


def test_delete_account_deletes_the_user_their_rows_and_their_files(client, user_id):
    a = make_application(user_id, resume_path=f"{user_id}/a/resume.pdf", cover_letter_path=f"{user_id}/a/cover_letter.pdf")
    make_application(user_id)
    make_application(user_id, resume_path=f"{user_id}/b/resume.pdf")
    sql("INSERT INTO application_status_history (application_id, user_id, new_status) VALUES ($1, $2, 'Applied')", a, user_id)
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, 30)", user_id)
    sql('INSERT INTO neon_auth.account ("userId", password) VALUES ($1, $2)', user_id, "hash")
    other = make_user("other@example.com")
    make_application(other, resume_path=f"{other}/c/resume.pdf")

    with patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete("/account")

    assert resp.status_code == 204
    assert sorted(delete_file.await_args_list) == sorted(
        [call(f"{user_id}/a/resume.pdf"), call(f"{user_id}/a/cover_letter.pdf"), call(f"{user_id}/b/resume.pdf")]
    )
    assert sql('SELECT id FROM neon_auth."user"') == [{"id": other}]
    for table in ("application_status_history", "user_settings", "neon_auth.account"):
        assert sql(f"SELECT count(*) AS n FROM {table}")[0]["n"] == 0, table
    # Only the other user's application is left
    assert sql("SELECT user_id FROM applications") == [{"user_id": other}]


def test_delete_account_without_applications(client, user_id):
    with patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete("/account")

    assert resp.status_code == 204
    delete_file.assert_not_awaited()
    assert sql('SELECT count(*) AS n FROM neon_auth."user"')[0]["n"] == 0


def test_delete_account_refuses_the_demo_account(client):
    demo_id = make_demo_user()
    make_application(demo_id)
    app.dependency_overrides[get_current_user] = lambda: demo_id

    with patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete("/account")

    assert resp.status_code == 403
    delete_file.assert_not_awaited()
    assert sql('SELECT count(*) AS n FROM neon_auth."user" WHERE id = $1', demo_id)[0]["n"] == 1


def test_account_routes_need_a_signed_in_user(anonymous_client):
    assert anonymous_client.delete("/account").status_code == 422  # no Authorization header
    assert anonymous_client.delete("/account", headers={"Authorization": "Basic abc"}).status_code == 401
