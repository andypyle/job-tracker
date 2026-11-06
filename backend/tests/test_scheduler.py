"""
Tests for the scheduler's nightly jobs: transition_unlikely() and reset_demo_accounts().

No real Supabase connection is made: FakeClient records each query's calls and returns canned rows.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.scheduler import group_users_by_cutoff, reset_demo_accounts, transition_unlikely


class FakeQuery:
    """A chainable query builder that records each call as (method, args)."""

    def __init__(self, table: str, result=None, error: Exception | None = None):
        self.table = table
        self.calls: list[tuple[str, tuple]] = []
        self._result = result or []
        self._error = error

    def __getattr__(self, name):
        # `not_` is a property on the real builder; the rest are methods
        if name == "not_":
            self.calls.append(("not_", ()))
            return self

        def method(*args, **kwargs):
            self.calls.append((name, args))
            return self

        return method

    def execute(self):
        if self._error:
            raise self._error

        class Result:
            data = self._result

        return Result()

    def args(self, method: str) -> list[tuple]:
        return [args for name, args in self.calls if name == method]


class FakeClient:
    """
    Hands out a FakeQuery per table() call. `results` maps a table to the rows each successive
    query returns (one list per query); `errors` maps a table to an exception its queries raise.
    """

    def __init__(self, results: dict[str, list[list[dict]]] | None = None, errors: dict | None = None):
        self.results = {table: list(rows) for table, rows in (results or {}).items()}
        self.errors = errors or {}
        self.queries: list[FakeQuery] = []

    def table(self, name: str) -> FakeQuery:
        rows = self.results.get(name, [])
        query = FakeQuery(name, rows.pop(0) if rows else [], self.errors.get(name))
        self.queries.append(query)
        return query

    def updates(self) -> list[FakeQuery]:
        return [q for q in self.queries if q.table == "applications"]

    def history_inserts(self) -> list[FakeQuery]:
        return [q for q in self.queries if q.table == "application_status_history"]


def _cutoff_days(query: FakeQuery) -> float:
    """How many days before now the query's date_applied cutoff is."""
    [(field, value)] = query.args("lte")
    assert field == "date_applied"
    return (datetime.now(tz=timezone.utc) - datetime.fromisoformat(value)) / timedelta(days=1)


async def _run(client: FakeClient):
    with patch("app.services.scheduler.create_client", return_value=client):
        await transition_unlikely()


# ---------------------------------------------------------------------------
# group_users_by_cutoff
# ---------------------------------------------------------------------------


def test_group_users_by_cutoff_splits_custom_and_never():
    rows = [
        {"user_id": "a", "unlikely_after_days": 7},
        {"user_id": "b", "unlikely_after_days": 30},
        {"user_id": "c", "unlikely_after_days": 7},
        {"user_id": "d", "unlikely_after_days": None},
        # The default needs no group of its own
        {"user_id": "e", "unlikely_after_days": 14},
    ]
    custom, never = group_users_by_cutoff(rows)
    assert custom == {7: ["a", "c"], 30: ["b"]}
    assert never == ["d"]


def test_group_users_by_cutoff_with_no_rows():
    assert group_users_by_cutoff([]) == ({}, [])


# ---------------------------------------------------------------------------
# transition_unlikely
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_transition_unlikely_without_settings_uses_14_days_for_everyone():
    """With no user_settings rows: one update, Applied rows older than 14 days, no user filter."""
    client = FakeClient()
    await _run(client)

    [update] = client.updates()
    assert update.args("update") == [({"status": "Unlikely"},)]
    assert update.args("eq") == [("status", "Applied")]
    assert abs(_cutoff_days(update) - 14) < 0.001
    assert update.args("in_") == []
    assert ("not_", ()) not in update.calls


@pytest.mark.asyncio
async def test_transition_unlikely_applies_each_users_cutoff():
    """The default update skips users with their own cutoff or none; each custom cutoff gets one."""
    client = FakeClient(
        results={
            "user_settings": [[
                {"user_id": "weekly", "unlikely_after_days": 7},
                {"user_id": "monthly", "unlikely_after_days": 30},
                {"user_id": "never", "unlikely_after_days": None},
                {"user_id": "default", "unlikely_after_days": 14},
            ]],
        }
    )
    await _run(client)

    default, seven, thirty = client.updates()

    assert abs(_cutoff_days(default) - 14) < 0.001
    assert ("not_", ()) in default.calls
    [(field, excluded)] = default.args("in_")
    assert field == "user_id"
    assert sorted(excluded) == ["monthly", "never", "weekly"]

    assert abs(_cutoff_days(seven) - 7) < 0.001
    assert seven.args("in_") == [("user_id", ["weekly"])]
    assert abs(_cutoff_days(thirty) - 30) < 0.001
    assert thirty.args("in_") == [("user_id", ["monthly"])]

    # Users who chose never appear in no update except as an exclusion
    for query in (seven, thirty):
        assert "never" not in query.args("in_")[0][1]


@pytest.mark.asyncio
async def test_transition_unlikely_records_history_for_every_moved_application():
    client = FakeClient(
        results={
            "user_settings": [[{"user_id": "weekly", "unlikely_after_days": 7}]],
            "applications": [
                [{"id": "app-1", "user_id": "someone"}],
                [{"id": "app-2", "user_id": "weekly"}],
            ],
        }
    )
    await _run(client)

    [insert] = client.history_inserts()
    [(entries,)] = insert.args("insert")
    assert entries == [
        {"application_id": "app-1", "user_id": "someone", "old_status": "Applied", "new_status": "Unlikely", "is_automatic": True},
        {"application_id": "app-2", "user_id": "weekly", "old_status": "Applied", "new_status": "Unlikely", "is_automatic": True},
    ]


@pytest.mark.asyncio
async def test_transition_unlikely_handles_empty_result():
    """Nothing to move: no history insert, no error."""
    client = FakeClient()
    await _run(client)
    assert client.history_inserts() == []


@pytest.mark.asyncio
async def test_transition_unlikely_skips_the_run_when_settings_fail():
    """Without the settings it can't tell who opted out, so nothing is moved."""
    client = FakeClient(errors={"user_settings": RuntimeError("DB connection failed")})
    await _run(client)
    assert client.updates() == []


@pytest.mark.asyncio
async def test_transition_unlikely_catches_exceptions():
    """If an update raises, transition_unlikely() catches it and returns."""
    client = FakeClient(errors={"applications": RuntimeError("DB connection failed")})
    # Should not propagate the exception
    await _run(client)


# ---------------------------------------------------------------------------
# reset_demo_accounts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reset_demo_accounts_calls_the_database_function_as_the_service_role():
    client = MagicMock()
    client.rpc.return_value.execute.return_value = MagicMock(data=1)

    with patch("app.services.scheduler.create_client", return_value=client) as create:
        await reset_demo_accounts()

    assert create.call_args.args[1] == "fake-service-role-key"
    client.rpc.assert_called_once_with("reset_demo_data")


@pytest.mark.asyncio
async def test_reset_demo_accounts_catches_exceptions():
    client = MagicMock()
    client.rpc.return_value.execute.side_effect = RuntimeError("DB connection failed")

    with patch("app.services.scheduler.create_client", return_value=client):
        await reset_demo_accounts()
