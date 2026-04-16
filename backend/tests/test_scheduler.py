"""
Tests for the scheduler's transition_unlikely() function.

No real Supabase connection is made — the client is fully mocked.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, call, patch

import pytest

from app.services.scheduler import transition_unlikely


def _make_supabase_chain_mock(data=None, raise_exc=None):
    """
    Build a mock supabase client whose table/update/eq/lte/execute chain
    behaves correctly.
    """
    execute_mock = MagicMock()
    if raise_exc:
        execute_mock.side_effect = raise_exc
    else:
        result = MagicMock()
        result.data = data or []
        execute_mock.return_value = result

    chain = MagicMock()
    chain.execute = execute_mock
    chain.eq = MagicMock(return_value=chain)
    chain.lte = MagicMock(return_value=chain)
    chain.update = MagicMock(return_value=chain)

    table_mock = MagicMock()
    table_mock.update = MagicMock(return_value=chain)

    client_mock = MagicMock()
    client_mock.table = MagicMock(return_value=table_mock)

    return client_mock, chain


@pytest.mark.asyncio
async def test_transition_unlikely_updates_old_applied():
    """
    transition_unlikely() calls supabase update with status='Unlikely'
    filtered to Applied rows whose date_applied is <= (today - 14 days).
    """
    updated_rows = [
        {"id": "app-1", "status": "Unlikely"},
        {"id": "app-2", "status": "Unlikely"},
    ]
    client_mock, chain = _make_supabase_chain_mock(data=updated_rows)

    with patch("app.services.scheduler.create_client", return_value=client_mock):
        await transition_unlikely()

    # update({"status": "Unlikely"}) should have been called
    table_mock = client_mock.table.return_value
    table_mock.update.assert_called_once_with({"status": "Unlikely"})

    # eq("status", "Applied") must have been called
    eq_calls = chain.eq.call_args_list
    eq_status_call = [c for c in eq_calls if c.args == ("status", "Applied")]
    assert len(eq_status_call) == 1, f"Expected eq('status','Applied'), got: {eq_calls}"

    # lte("date_applied", <cutoff>) must have been called
    lte_calls = chain.lte.call_args_list
    assert len(lte_calls) == 1
    lte_field = lte_calls[0].args[0]
    assert lte_field == "date_applied"


@pytest.mark.asyncio
async def test_transition_unlikely_uses_14_day_cutoff():
    """
    The cutoff date passed to .lte() must be exactly 14 days ago (not 13).
    """
    client_mock, chain = _make_supabase_chain_mock(data=[])

    now = datetime.now(tz=timezone.utc)
    expected_cutoff = now - timedelta(days=14)

    with patch("app.services.scheduler.create_client", return_value=client_mock):
        await transition_unlikely()

    lte_calls = chain.lte.call_args_list
    assert len(lte_calls) == 1
    actual_cutoff_str = lte_calls[0].args[1]

    # Parse back and verify it is close to 14 days ago (within 5 seconds tolerance)
    actual_cutoff = datetime.fromisoformat(actual_cutoff_str)
    diff = abs((actual_cutoff - expected_cutoff).total_seconds())
    assert diff < 5, (
        f"Expected cutoff ~14 days ago, got {actual_cutoff_str} "
        f"(diff={diff:.1f}s from {expected_cutoff.isoformat()})"
    )


@pytest.mark.asyncio
async def test_transition_unlikely_handles_empty_result():
    """transition_unlikely() handles an empty result set without error."""
    client_mock, _ = _make_supabase_chain_mock(data=[])

    with patch("app.services.scheduler.create_client", return_value=client_mock):
        # Should not raise
        await transition_unlikely()


@pytest.mark.asyncio
async def test_transition_unlikely_catches_exceptions():
    """If supabase raises an exception, transition_unlikely() catches it and returns."""
    client_mock, _ = _make_supabase_chain_mock(raise_exc=RuntimeError("DB connection failed"))

    with patch("app.services.scheduler.create_client", return_value=client_mock):
        # Should not propagate the exception
        await transition_unlikely()
