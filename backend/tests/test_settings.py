"""
Tests for GET and PATCH /settings.

All Supabase calls are mocked: create_client is patched where the router imports it.
"""
from unittest.mock import MagicMock, patch

import pytest

from tests.conftest import TEST_USER_ID

AUTH_HEADER = {"Authorization": "Bearer fake-token"}


def _make_client_mock(data=None, raise_exc=None):
    """A client whose table(...) chain (select/eq/limit/upsert) ends in execute()."""
    chain = MagicMock()
    for method in ("select", "eq", "limit", "upsert"):
        getattr(chain, method).return_value = chain
    if raise_exc:
        chain.execute.side_effect = raise_exc
    else:
        chain.execute.return_value = MagicMock(data=data)

    client_mock = MagicMock()
    client_mock.table.return_value = chain
    return client_mock, chain


# ---------------------------------------------------------------------------
# GET /settings
# ---------------------------------------------------------------------------


def test_get_settings_returns_the_saved_value(client):
    client_mock, chain = _make_client_mock([{"unlikely_after_days": 30}])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.get("/settings", headers=AUTH_HEADER)

    assert resp.status_code == 200
    assert resp.json() == {"data": {"unlikely_after_days": 30}, "error": None}
    client_mock.table.assert_called_with("user_settings")
    chain.eq.assert_called_with("user_id", TEST_USER_ID)
    # Scoped to the user's JWT, so RLS applies
    client_mock.postgrest.auth.assert_called_once_with("fake-token")


def test_get_settings_returns_never_as_null(client):
    client_mock, _ = _make_client_mock([{"unlikely_after_days": None}])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.get("/settings", headers=AUTH_HEADER)

    assert resp.json()["data"] == {"unlikely_after_days": None}


def test_get_settings_defaults_to_14_days_without_a_row(client):
    client_mock, _ = _make_client_mock([])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.get("/settings", headers=AUTH_HEADER)

    assert resp.status_code == 200
    assert resp.json()["data"] == {"unlikely_after_days": 14}


def test_get_settings_returns_500_on_database_error(client):
    client_mock, _ = _make_client_mock(raise_exc=RuntimeError("boom"))

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.get("/settings", headers=AUTH_HEADER)

    assert resp.status_code == 500


# ---------------------------------------------------------------------------
# PATCH /settings
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("days", [7, 14, 21, 30, 60, None])
def test_update_settings_upserts_each_allowed_value(client, days):
    client_mock, chain = _make_client_mock([{"user_id": TEST_USER_ID, "unlikely_after_days": days}])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.patch("/settings", json={"unlikely_after_days": days}, headers=AUTH_HEADER)

    assert resp.status_code == 200
    assert resp.json() == {"data": {"unlikely_after_days": days}, "error": None}
    chain.upsert.assert_called_once_with(
        {"user_id": TEST_USER_ID, "unlikely_after_days": days}, on_conflict="user_id"
    )


@pytest.mark.parametrize("days", [0, 1, 13, 90, -7, "14"])
def test_update_settings_rejects_other_values(client, days):
    client_mock, chain = _make_client_mock([])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.patch("/settings", json={"unlikely_after_days": days}, headers=AUTH_HEADER)

    assert resp.status_code == 422
    chain.upsert.assert_not_called()


def test_update_settings_requires_the_field(client):
    """Null means never, so leaving the field out mustn't quietly turn the move off."""
    client_mock, chain = _make_client_mock([])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.patch("/settings", json={}, headers=AUTH_HEADER)

    assert resp.status_code == 422
    chain.upsert.assert_not_called()


def test_update_settings_ignores_a_user_id_in_the_body(client):
    """The row always belongs to the JWT's user."""
    client_mock, chain = _make_client_mock([{"user_id": TEST_USER_ID, "unlikely_after_days": 7}])

    with patch("app.routers.settings.create_client", return_value=client_mock):
        client.patch(
            "/settings", json={"unlikely_after_days": 7, "user_id": "someone-else"}, headers=AUTH_HEADER
        )

    chain.upsert.assert_called_once_with({"user_id": TEST_USER_ID, "unlikely_after_days": 7}, on_conflict="user_id")


def test_update_settings_returns_500_on_database_error(client):
    client_mock, _ = _make_client_mock(raise_exc=RuntimeError("boom"))

    with patch("app.routers.settings.create_client", return_value=client_mock):
        resp = client.patch("/settings", json={"unlikely_after_days": 7}, headers=AUTH_HEADER)

    assert resp.status_code == 500
