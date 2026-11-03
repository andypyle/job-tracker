"""
Tests for DELETE /account.

All Supabase calls are mocked: create_client and delete_file are patched where the router imports them.
"""
from unittest.mock import AsyncMock, MagicMock, call, patch

from tests.conftest import TEST_USER_ID

AUTH_HEADER = {"Authorization": "Bearer fake-token"}


def _make_admin_mock(rows=None, select_exc=None, delete_exc=None):
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    if select_exc:
        chain.execute.side_effect = select_exc
    else:
        chain.execute.return_value = MagicMock(data=rows or [])

    admin = MagicMock()
    admin.table.return_value = chain
    if delete_exc:
        admin.auth.admin.delete_user.side_effect = delete_exc
    return admin, chain


def test_delete_account_deletes_the_user_and_their_files(client):
    rows = [
        {"resume_path": f"{TEST_USER_ID}/a/resume.pdf", "cover_letter_path": f"{TEST_USER_ID}/a/cover_letter.pdf"},
        {"resume_path": None, "cover_letter_path": None},
        {"resume_path": f"{TEST_USER_ID}/b/resume.pdf", "cover_letter_path": None},
    ]
    admin, chain = _make_admin_mock(rows)

    with (
        patch("app.routers.account.create_client", return_value=admin) as create,
        patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file,
    ):
        resp = client.delete("/account", headers=AUTH_HEADER)

    assert resp.status_code == 204
    # The service role client: deleting an auth user needs it
    assert create.call_args.args[1] == "fake-service-role-key"
    # Only the JWT's user, never anything from the request
    chain.eq.assert_called_once_with("user_id", TEST_USER_ID)
    admin.auth.admin.delete_user.assert_called_once_with(TEST_USER_ID)
    assert delete_file.call_args_list == [
        call(f"{TEST_USER_ID}/a/resume.pdf"),
        call(f"{TEST_USER_ID}/a/cover_letter.pdf"),
        call(f"{TEST_USER_ID}/b/resume.pdf"),
    ]


def test_delete_account_without_applications(client):
    admin, _ = _make_admin_mock([])

    with (
        patch("app.routers.account.create_client", return_value=admin),
        patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file,
    ):
        resp = client.delete("/account", headers=AUTH_HEADER)

    assert resp.status_code == 204
    admin.auth.admin.delete_user.assert_called_once_with(TEST_USER_ID)
    delete_file.assert_not_called()


def test_delete_account_keeps_files_when_the_user_delete_fails(client):
    """A failed user delete leaves the account whole: its files stay too."""
    admin, _ = _make_admin_mock(
        [{"resume_path": f"{TEST_USER_ID}/a/resume.pdf", "cover_letter_path": None}],
        delete_exc=RuntimeError("auth down"),
    )

    with (
        patch("app.routers.account.create_client", return_value=admin),
        patch("app.routers.account.delete_file", new_callable=AsyncMock) as delete_file,
    ):
        resp = client.delete("/account", headers=AUTH_HEADER)

    assert resp.status_code == 500
    delete_file.assert_not_called()


def test_delete_account_stops_when_the_file_lookup_fails(client):
    admin, _ = _make_admin_mock(select_exc=RuntimeError("db down"))

    with (
        patch("app.routers.account.create_client", return_value=admin),
        patch("app.routers.account.delete_file", new_callable=AsyncMock),
    ):
        resp = client.delete("/account", headers=AUTH_HEADER)

    assert resp.status_code == 500
    admin.auth.admin.delete_user.assert_not_called()


def test_delete_account_needs_a_signed_in_user():
    """Without the dependency override, a request with no Authorization header deletes nothing."""
    from fastapi.testclient import TestClient

    from app.main import app

    admin, _ = _make_admin_mock([])
    with (
        patch("app.main.start_scheduler"),
        patch("app.main.stop_scheduler"),
        patch("app.routers.account.create_client", return_value=admin),
        TestClient(app) as anonymous,
    ):
        resp = anonymous.delete("/account")

    # FastAPI rejects the missing required header before get_current_user runs
    assert resp.status_code in (401, 422)
    admin.auth.admin.delete_user.assert_not_called()
