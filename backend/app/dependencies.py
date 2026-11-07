import asyncio
from functools import lru_cache

import jwt
from fastapi import Depends, Header, HTTPException

from app import db
from app.config import get_settings


@lru_cache()
def _jwks_client() -> jwt.PyJWKClient:
    # Caches the key set; a token signed with an unknown kid makes it refetch
    return jwt.PyJWKClient(get_settings().neon_auth_jwks_url, cache_keys=True)


def verify_token(token: str) -> dict:
    """
    Verify a Neon Auth JWT (EdDSA, 15-minute expiry) against the branch's JWKS and return its
    claims. Raises jwt.InvalidTokenError (or PyJWKClientError) if it isn't valid.
    """
    settings = get_settings()
    key = _jwks_client().get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        key,
        algorithms=["EdDSA"],
        audience=settings.neon_auth_issuer,
        issuer=settings.neon_auth_issuer,
        options={"require": ["exp", "sub"]},
    )


async def get_auth_user(authorization: str = Header(...)) -> dict:
    """
    Verify the Neon Auth JWT from the Authorization header and return its claims.
    Raises HTTP 401 if the token is missing, malformed, or invalid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")

    try:
        # The JWKS fetch (on a cache miss) is blocking I/O
        return await asyncio.to_thread(verify_token, token)
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(user: dict = Depends(get_auth_user)) -> str:
    """The verified user's id."""
    return user["sub"]


async def is_demo_user(user_id: str) -> bool:
    """The public demo account: a row in demo_users, which only the database owner can write."""
    return bool(await db.pool().fetchval("SELECT EXISTS (SELECT 1 FROM public.demo_users WHERE user_id = $1)", user_id))


async def reject_demo_user(user_id: str = Depends(get_current_user)) -> None:
    """For routes the demo account can't use: deleting the account, uploading files."""
    if await is_demo_user(user_id):
        raise HTTPException(status_code=403, detail="The demo account can’t do that.")
