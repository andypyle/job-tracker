"""
Live smoke tests against a real Neon branch: its Postgres, Neon Auth and Object Storage. They
cover what tests/ can't with a stand-in: real JWTs and JWKS, the demo guard against Neon Auth's
own endpoints, the delete cascade through Neon's tables, and presigned URLs.

Run them against a throwaway branch with the migrations applied (CI makes one per run with
scripts/neon_branch.py), never production: they create and delete users.

    pytest smoke    # with DATABASE_URL, NEON_AUTH_BASE_URL and the AWS_* storage settings set

The backend runs in-process (TestClient) with those settings; Neon Auth is called over HTTP.
"""
import asyncio
import os
import uuid
from unittest.mock import patch

import asyncpg
import httpx
import pytest

REQUIRED = ("DATABASE_URL", "NEON_AUTH_BASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
missing = [name for name in REQUIRED if not os.environ.get(name)]
if missing:
    raise RuntimeError(f"Smoke tests need a Neon branch's settings; missing {', '.join(missing)}")

# Neon Auth only accepts requests from trusted origins; localhost is allowed by default
ORIGIN = os.environ.get("SMOKE_ORIGIN", "http://localhost:5173")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def sql(query: str, *args) -> list[dict]:
    async def run():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
        try:
            return [dict(row) for row in await conn.fetch(query, *args)]
        finally:
            await conn.close()

    return asyncio.run(run())


class AuthUser:
    """A user signed in through the branch's Neon Auth, with their session cookie."""

    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password
        self.http = httpx.Client(
            base_url=os.environ["NEON_AUTH_BASE_URL"].rstrip("/"),
            headers={"Origin": ORIGIN},
            timeout=30,
        )
        self.id: str | None = None

    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        return self.http.request(method, path, **kwargs)

    def sign_up(self, name: str) -> "AuthUser":
        response = self.request("POST", "/sign-up/email", json={"name": name, "email": self.email, "password": self.password})
        assert response.status_code == 200, response.text
        self.id = response.json()["user"]["id"]
        return self

    def token(self) -> str:
        response = self.request("GET", "/token")
        assert response.status_code == 200, response.text
        return response.json()["token"]

    def headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token()}"}


@pytest.fixture
def new_user():
    """Signs up throwaway users with unique emails; deletes whatever's left of them afterwards."""
    users: list[AuthUser] = []

    def make(name: str = "Smoke Test") -> AuthUser:
        user = AuthUser(f"smoke-{uuid.uuid4().hex[:12]}@example.com", f"pw-{uuid.uuid4().hex}").sign_up(name)
        users.append(user)
        return user

    yield make

    ids = [user.id for user in users if user.id]
    if ids:
        sql('DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])', ids)
    for user in users:
        user.http.close()


@pytest.fixture
def api():
    with patch("app.main.start_scheduler"), patch("app.main.stop_scheduler"):
        with TestClient(app) as client:
            yield client
