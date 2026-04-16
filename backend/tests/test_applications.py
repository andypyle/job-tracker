"""
Tests for /applications CRUD routes.

All Supabase calls are mocked — no real database connections.
The _get_user_client and _get_service_client helpers in the router create
supabase Clients, so we patch supabase.create_client at the point it is
imported by the router module.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import TEST_APP_ID, TEST_USER_ID

AUTH_HEADER = {"Authorization": "Bearer fake-token"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_supabase_mock(data, *, single=False, raise_exc=None):
    """
    Build a mock that mimics the supabase-py query-builder chain:
        client.table(...).select(...).eq(...).order(...).execute()
    and optionally .single().execute().
    """
    execute_mock = MagicMock()
    if raise_exc:
        execute_mock.side_effect = raise_exc
    else:
        result = MagicMock()
        result.data = data
        execute_mock.return_value = result

    chain = MagicMock()
    chain.execute = execute_mock
    chain.eq = MagicMock(return_value=chain)
    chain.order = MagicMock(return_value=chain)
    chain.single = MagicMock(return_value=chain)
    chain.lte = MagicMock(return_value=chain)

    table_mock = MagicMock()
    table_mock.select = MagicMock(return_value=chain)
    table_mock.insert = MagicMock(return_value=chain)
    table_mock.update = MagicMock(return_value=chain)
    table_mock.delete = MagicMock(return_value=chain)

    client_mock = MagicMock()
    client_mock.table = MagicMock(return_value=table_mock)
    client_mock.postgrest = MagicMock()

    return client_mock, chain


# ---------------------------------------------------------------------------
# GET /applications
# ---------------------------------------------------------------------------


def test_list_applications_returns_user_data(client):
    """GET /applications returns the rows from Supabase for the authenticated user."""
    rows = [
        {
            "id": TEST_APP_ID,
            "user_id": TEST_USER_ID,
            "job_title": "Software Engineer",
            "company": "Acme",
            "status": "Applied",
            "date_applied": "2026-04-01",
            "is_referral": False,
            "created_at": "2026-04-01T00:00:00",
            "updated_at": "2026-04-01T00:00:00",
        }
    ]
    client_mock, _ = _make_supabase_mock(rows)

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.get("/applications", headers=AUTH_HEADER)

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert len(body["data"]) == 1
    assert body["data"][0]["id"] == TEST_APP_ID


def test_list_applications_filters_by_status(client):
    """GET /applications?status=Applied calls .eq('status', 'Applied') on the query."""
    rows = [
        {
            "id": TEST_APP_ID,
            "user_id": TEST_USER_ID,
            "job_title": "Engineer",
            "company": "Corp",
            "status": "Applied",
            "date_applied": "2026-04-01",
            "is_referral": False,
            "created_at": "2026-04-01T00:00:00",
            "updated_at": "2026-04-01T00:00:00",
        }
    ]
    client_mock, chain = _make_supabase_mock(rows)

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.get("/applications?status=Applied", headers=AUTH_HEADER)

    assert resp.status_code == 200
    # Verify .eq was called at least once with status filtering
    eq_calls = [str(call) for call in chain.eq.call_args_list]
    status_filter_called = any("status" in c and "Applied" in c for c in eq_calls)
    assert status_filter_called, f"Expected status filter call, got: {eq_calls}"


# ---------------------------------------------------------------------------
# GET /applications/{id}
# ---------------------------------------------------------------------------


def test_get_application_not_found(client):
    """GET /applications/{id} returns 404 when supabase single() raises (no row)."""
    client_mock, _ = _make_supabase_mock(None, raise_exc=Exception("No rows found"))

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.get(f"/applications/{TEST_APP_ID}", headers=AUTH_HEADER)

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# POST /applications
# ---------------------------------------------------------------------------


def test_create_application_sets_status_to_applied(client):
    """POST /applications always creates with status='Applied', ignoring any other value."""
    created_row = {
        "id": TEST_APP_ID,
        "user_id": TEST_USER_ID,
        "job_title": "Senior Engineer",
        "company": "TestCo",
        "status": "Applied",
        "date_applied": "2026-04-01",
        "is_referral": False,
        "resume_path": None,
        "cover_letter_path": None,
        "created_at": "2026-04-01T00:00:00",
        "updated_at": "2026-04-01T00:00:00",
    }
    client_mock, chain = _make_supabase_mock([created_row])

    payload = {
        "job_title": "Senior Engineer",
        "company": "TestCo",
        "date_applied": "2026-04-01",
        "is_referral": False,
    }

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.post("/applications", json=payload, headers=AUTH_HEADER)

    assert resp.status_code == 201
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["status"] == "Applied"

    # Confirm the insert was called with status=Applied
    insert_call_args = client_mock.table.return_value.insert.call_args
    assert insert_call_args is not None
    inserted_data = insert_call_args[0][0]
    assert inserted_data["status"] == "Applied"


def test_create_application_sets_user_id_from_jwt(client):
    """POST /applications always uses user_id from the JWT dep, not from the request body."""
    created_row = {
        "id": TEST_APP_ID,
        "user_id": TEST_USER_ID,
        "job_title": "Engineer",
        "company": "Corp",
        "status": "Applied",
        "date_applied": "2026-04-01",
        "is_referral": False,
        "resume_path": None,
        "cover_letter_path": None,
        "created_at": "2026-04-01T00:00:00",
        "updated_at": "2026-04-01T00:00:00",
    }
    client_mock, _ = _make_supabase_mock([created_row])

    payload = {
        "job_title": "Engineer",
        "company": "Corp",
        "date_applied": "2026-04-01",
        "is_referral": False,
    }

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.post("/applications", json=payload, headers=AUTH_HEADER)

    assert resp.status_code == 201
    insert_call_args = client_mock.table.return_value.insert.call_args
    inserted_data = insert_call_args[0][0]
    assert inserted_data["user_id"] == TEST_USER_ID


# ---------------------------------------------------------------------------
# PATCH /applications/{id}
# ---------------------------------------------------------------------------


def test_update_application_returns_404_for_wrong_user(client):
    """PATCH /applications/{id} returns 404 when ownership check raises (different user's app)."""
    # The first .single().execute() raises — simulating no row found for this user_id
    client_mock, _ = _make_supabase_mock(None, raise_exc=Exception("No rows found"))

    payload = {"job_title": "Updated Title"}

    with patch("app.routers.applications.create_client", return_value=client_mock):
        resp = client.patch(
            f"/applications/{TEST_APP_ID}",
            json=payload,
            headers=AUTH_HEADER,
        )

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# DELETE /applications/{id}
# ---------------------------------------------------------------------------


def test_delete_application_cleans_up_files(client):
    """DELETE /applications/{id} calls delete_file for resume and cover letter paths."""
    existing_row = {
        "id": TEST_APP_ID,
        "resume_path": f"{TEST_USER_ID}/{TEST_APP_ID}/resume.pdf",
        "cover_letter_path": f"{TEST_USER_ID}/{TEST_APP_ID}/cover_letter.pdf",
    }

    # First call returns existing row (ownership check), second call is the delete
    client_mock, chain = _make_supabase_mock(existing_row)

    with (
        patch("app.routers.applications.create_client", return_value=client_mock),
        patch("app.routers.applications.delete_file", new_callable=AsyncMock) as mock_delete,
    ):
        resp = client.delete(f"/applications/{TEST_APP_ID}", headers=AUTH_HEADER)

    assert resp.status_code == 204

    # Both file paths should have been passed to delete_file
    delete_calls = [call.args[0] for call in mock_delete.call_args_list]
    assert f"{TEST_USER_ID}/{TEST_APP_ID}/resume.pdf" in delete_calls
    assert f"{TEST_USER_ID}/{TEST_APP_ID}/cover_letter.pdf" in delete_calls
