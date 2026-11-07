"""
The Postgres connection pool (Neon). Opened and closed by the app's lifespan.

Every query filters by the user_id from the verified JWT; there's no RLS behind it, so a query
that forgets the filter reads everyone's rows.
"""
from typing import Optional
from uuid import UUID

import asyncpg

from app.config import get_settings

_pool: Optional[asyncpg.Pool] = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    # UUIDs as plain strings, both ways: they go straight into JSON and compare with JWT subjects
    await conn.set_type_codec("uuid", encoder=str, decoder=str, schema="pg_catalog", format="text")


async def open_pool() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            get_settings().DATABASE_URL,
            min_size=1,
            max_size=10,
            # Neon's pooler runs PgBouncer in transaction mode, which can't keep prepared statements
            statement_cache_size=0,
            init=_init_connection,
        )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("The database pool isn't open")
    return _pool


def as_dict(record: Optional[asyncpg.Record]) -> Optional[dict]:
    return dict(record) if record is not None else None


def is_uuid(value: str) -> bool:
    """Whether a path id can be a row id. Postgres raises on a malformed UUID; routes 404 instead."""
    try:
        UUID(value)
    except ValueError:
        return False
    return True
