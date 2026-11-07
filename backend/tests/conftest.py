"""
Shared pytest fixtures for all backend tests.

The routes run real SQL against a disposable Postgres named by TEST_DATABASE_URL, e.g.
    TEST_DATABASE_URL=postgresql://postgres@localhost:5432/jobtracker_test
CI runs one as a service container; locally, `docker run -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:18`
and `createdb -h localhost -U postgres jobtracker_test` (or any local Postgres 14+) will do.

- The schema is rebuilt once per session from db/migrations, on top of a stand-in for Neon
  Auth's neon_auth tables (only the columns the migrations touch). Every test starts empty.
- get_current_user and get_auth_user are overridden, so no JWT is needed; test_auth.py tests
  the real verification.
- Object Storage is patched per test where a router imports it.
"""
import asyncio
import os
import re
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

import asyncpg
import pytest

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "Set TEST_DATABASE_URL to a disposable local Postgres database; the tests drop and rebuild its schema."
    )
if urlsplit(TEST_DATABASE_URL).hostname not in ("localhost", "127.0.0.1", "postgres"):
    raise RuntimeError("TEST_DATABASE_URL must point at a local database: the tests drop its schema.")

# Settings come from the environment, so set them before the app is imported
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("NEON_AUTH_BASE_URL", "https://auth.test.invalid/neondb/auth")
os.environ.setdefault("AWS_ENDPOINT_URL_S3", "https://storage.test.invalid")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "test-key")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test-secret")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

from fastapi.testclient import TestClient  # noqa: E402

from app.dependencies import get_auth_user, get_current_user  # noqa: E402
from app.main import app  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations"

# The parts of Neon Auth's schema the migrations reference: FKs to user, guard triggers on user
# and account
NEON_AUTH_STAND_IN = """
CREATE SCHEMA neon_auth;
CREATE TABLE neon_auth."user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  image text
);
CREATE TABLE neon_auth.account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  password text
);
"""


def _up_section(sql: str) -> str:
    """The `-- migrate:up` half of a dbmate migration."""
    match = re.search(r"--\s*migrate:up(.*?)(--\s*migrate:down|\Z)", sql, re.S)
    return match.group(1) if match else sql


async def _connect() -> asyncpg.Connection:
    conn = await asyncpg.connect(TEST_DATABASE_URL)
    await conn.set_type_codec("uuid", encoder=str, decoder=str, schema="pg_catalog", format="text")
    return conn


def sql(query: str, *args) -> list[dict]:
    """Run one statement against the test database from a sync test. Returns the rows."""

    async def run():
        conn = await _connect()
        try:
            return [dict(row) for row in await conn.fetch(query, *args)]
        finally:
            await conn.close()

    return asyncio.run(run())


def make_user(email: str = "user@example.com", name: str = "Test User") -> str:
    return sql('INSERT INTO neon_auth."user" (name, email) VALUES ($1, $2) RETURNING id', name, email)[0]["id"]


def make_demo_user() -> str:
    user_id = make_user("demo@example.com", "Demo User")
    sql("INSERT INTO public.demo_users (user_id) VALUES ($1)", user_id)
    return user_id


def make_application(user_id: str, **fields) -> str:
    row = {"job_title": "Engineer", "company": "Acme", "date_applied": "2026-10-01", **fields}
    if isinstance(row["date_applied"], str):
        from datetime import date

        row["date_applied"] = date.fromisoformat(row["date_applied"])
    columns = list(row)
    placeholders = ", ".join(f"${i}" for i in range(2, len(columns) + 2))
    return sql(
        f"INSERT INTO public.applications (user_id, {', '.join(columns)}) VALUES ($1, {placeholders}) RETURNING id",
        user_id,
        *row.values(),
    )[0]["id"]


@pytest.fixture(scope="session", autouse=True)
def schema():
    """Rebuild the schema once: the Neon Auth stand-in, then every migration in order."""

    async def build():
        conn = await asyncpg.connect(TEST_DATABASE_URL)
        try:
            await conn.execute("DROP SCHEMA IF EXISTS neon_auth CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
            await conn.execute(NEON_AUTH_STAND_IN)
            for migration in sorted(MIGRATIONS.glob("*.sql")):
                await conn.execute(_up_section(migration.read_text()))
        finally:
            await conn.close()

    asyncio.run(build())


@pytest.fixture(autouse=True)
def empty_tables(schema):
    # Every app table hangs off neon_auth.user, so this empties them all
    sql('TRUNCATE neon_auth."user" CASCADE')


@pytest.fixture
def user_id() -> str:
    """A signed-in (non-demo) user. The client fixture authenticates as them."""
    return make_user()


@pytest.fixture
def client(user_id):
    """
    TestClient signed in as user_id. The lifespan opens the real pool against the test database;
    APScheduler is patched out so no nightly jobs start.
    """
    app.dependency_overrides[get_current_user] = lambda: user_id
    app.dependency_overrides[get_auth_user] = lambda: {"sub": user_id}
    with patch("app.main.start_scheduler"), patch("app.main.stop_scheduler"):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()


@pytest.fixture
def anonymous_client():
    """TestClient with the real auth dependencies, for testing that routes require a JWT."""
    with patch("app.main.start_scheduler"), patch("app.main.stop_scheduler"):
        with TestClient(app) as c:
            yield c
