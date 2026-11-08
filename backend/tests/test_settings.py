"""Tests for GET and PATCH /settings."""
import pytest

from tests.conftest import make_user, sql


def test_get_settings_defaults_to_14_days_without_a_row(client):
    resp = client.get("/settings")

    assert resp.status_code == 200
    assert resp.json() == {"data": {"unlikely_after_days": 14}, "error": None}


def test_get_settings_returns_the_saved_value(client, user_id):
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, 30)", user_id)
    assert client.get("/settings").json()["data"] == {"unlikely_after_days": 30}


def test_get_settings_returns_never_as_null(client, user_id):
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, NULL)", user_id)
    assert client.get("/settings").json()["data"] == {"unlikely_after_days": None}


@pytest.mark.parametrize("days", [7, 14, 21, 30, 60, None])
def test_update_settings_saves_each_allowed_value(client, user_id, days):
    resp = client.patch("/settings", json={"unlikely_after_days": days})

    assert resp.status_code == 200
    assert resp.json() == {"data": {"unlikely_after_days": days}, "error": None}
    assert sql("SELECT unlikely_after_days FROM user_settings WHERE user_id = $1", user_id) == [
        {"unlikely_after_days": days}
    ]


def test_update_settings_updates_an_existing_row(client, user_id):
    client.patch("/settings", json={"unlikely_after_days": 7})
    client.patch("/settings", json={"unlikely_after_days": 60})

    assert sql("SELECT unlikely_after_days FROM user_settings WHERE user_id = $1", user_id) == [
        {"unlikely_after_days": 60}
    ]


@pytest.mark.parametrize("days", [0, 10, 90, "fourteen"])
def test_update_settings_rejects_other_values(client, days):
    assert client.patch("/settings", json={"unlikely_after_days": days}).status_code == 422


def test_update_settings_requires_the_field(client):
    assert client.patch("/settings", json={}).status_code == 422


def test_update_settings_ignores_a_user_id_in_the_body(client, user_id):
    other = make_user("other@example.com")

    client.patch("/settings", json={"unlikely_after_days": 30, "user_id": other})

    assert sql("SELECT user_id FROM user_settings") == [{"user_id": user_id}]


def test_get_settings_ignores_another_users_row(client):
    other = make_user("other@example.com")
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, 60)", other)

    assert client.get("/settings").json()["data"] == {"unlikely_after_days": 14}


def test_update_settings_leaves_another_users_row_alone(client, user_id):
    other = make_user("other@example.com")
    sql("INSERT INTO user_settings (user_id, unlikely_after_days) VALUES ($1, 60)", other)

    client.patch("/settings", json={"unlikely_after_days": 7})

    assert sql("SELECT user_id, unlikely_after_days FROM user_settings ORDER BY unlikely_after_days") == [
        {"user_id": user_id, "unlikely_after_days": 7},
        {"user_id": other, "unlikely_after_days": 60},
    ]
