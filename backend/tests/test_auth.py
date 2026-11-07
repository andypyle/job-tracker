"""
Tests for JWT verification (get_auth_user) and the demo guard triggers on Neon Auth's tables.
Tokens are signed with a local Ed25519 key standing in for the branch's JWKS.
"""
import time
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import HTTPException

from app.config import get_settings
from app.dependencies import get_auth_user
from tests.conftest import make_demo_user, make_user, sql

KEY = Ed25519PrivateKey.generate()
OTHER_KEY = Ed25519PrivateKey.generate()


def token(key=KEY, **overrides) -> str:
    issuer = get_settings().neon_auth_issuer
    now = int(time.time())
    claims = {"sub": "user-1", "email": "a@example.com", "iat": now, "exp": now + 900, "iss": issuer, "aud": issuer}
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="EdDSA", headers={"kid": "test"})


@pytest.fixture(autouse=True)
def jwks():
    """The JWKS client hands back our public key, whatever the token says."""
    client = MagicMock()
    client.get_signing_key_from_jwt.return_value = MagicMock(key=KEY.public_key())
    with patch("app.dependencies._jwks_client", return_value=client):
        yield client


async def test_valid_token_returns_its_claims():
    claims = await get_auth_user(f"Bearer {token()}")
    assert claims["sub"] == "user-1"


@pytest.mark.parametrize(
    "bad",
    [
        pytest.param(lambda: token(exp=int(time.time()) - 10), id="expired"),
        pytest.param(lambda: token(key=OTHER_KEY), id="wrong key"),
        pytest.param(lambda: token(iss="https://evil.example"), id="wrong issuer"),
        pytest.param(lambda: token(aud="https://evil.example"), id="wrong audience"),
        pytest.param(lambda: token(sub=None), id="no subject"),
        pytest.param(lambda: "not.a.jwt", id="garbage"),
    ],
)
async def test_invalid_tokens_are_401(bad):
    with pytest.raises(HTTPException) as exc:
        await get_auth_user(f"Bearer {bad()}")
    assert exc.value.status_code == 401


@pytest.mark.parametrize("header", ["", "Bearer ", "Basic abc", token()])
async def test_malformed_headers_are_401(header):
    with pytest.raises(HTTPException) as exc:
        await get_auth_user(header)
    assert exc.value.status_code == 401


async def test_unreachable_jwks_is_401(jwks):
    jwks.get_signing_key_from_jwt.side_effect = jwt.PyJWKClientConnectionError("down")
    with pytest.raises(HTTPException) as exc:
        await get_auth_user(f"Bearer {token()}")
    assert exc.value.status_code == 401


def test_routes_accept_a_valid_token(anonymous_client):
    user_id = make_user()
    resp = anonymous_client.get("/settings", headers={"Authorization": f"Bearer {token(sub=user_id)}"})
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# The demo guard: triggers on neon_auth.user and neon_auth.account
# ---------------------------------------------------------------------------


def test_demo_profile_changes_are_undone():
    demo = make_demo_user()

    sql('UPDATE neon_auth."user" SET name = $2, email = $3, image = $4 WHERE id = $1', demo, "Hacked", "x@evil.example", "https://evil.example/x.png")

    assert sql('SELECT name, email, image FROM neon_auth."user" WHERE id = $1', demo) == [
        {"name": "Demo User", "email": "demo@example.com", "image": None}
    ]


def test_demo_password_changes_are_undone():
    demo = make_demo_user()
    sql('INSERT INTO neon_auth.account ("userId", password) VALUES ($1, $2)', demo, "original-hash")

    sql('UPDATE neon_auth.account SET password = $2 WHERE "userId" = $1', demo, "new-hash")

    assert sql('SELECT password FROM neon_auth.account WHERE "userId" = $1', demo) == [{"password": "original-hash"}]


def test_other_users_can_change_their_profile_and_password():
    user = make_user()
    sql('INSERT INTO neon_auth.account ("userId", password) VALUES ($1, $2)', user, "original-hash")

    sql('UPDATE neon_auth."user" SET name = $2 WHERE id = $1', user, "New Name")
    sql('UPDATE neon_auth.account SET password = $2 WHERE "userId" = $1', user, "new-hash")

    assert sql('SELECT name FROM neon_auth."user" WHERE id = $1', user) == [{"name": "New Name"}]
    assert sql('SELECT password FROM neon_auth.account WHERE "userId" = $1', user) == [{"password": "new-hash"}]


def test_demo_changes_go_through_once_unflagged():
    demo = make_demo_user()
    sql("DELETE FROM demo_users WHERE user_id = $1", demo)

    sql('UPDATE neon_auth."user" SET name = $2 WHERE id = $1', demo, "Renamed")

    assert sql('SELECT name FROM neon_auth."user" WHERE id = $1', demo) == [{"name": "Renamed"}]
