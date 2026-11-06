import httpx
from fastapi import Depends, Header, HTTPException

from app.config import get_settings


async def get_auth_user(authorization: str = Header(...)) -> dict:
    """
    Verify the Supabase JWT from the Authorization header and return the Supabase user.
    Raises HTTP 401 if the token is missing, malformed, or invalid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")

    settings = get_settings()
    url = f"{settings.SUPABASE_URL}/auth/v1/user"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_ANON_KEY,
                },
                timeout=10.0,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=401, detail="Could not verify token")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return response.json()


async def get_current_user(user: dict = Depends(get_auth_user)) -> str:
    """The verified user's id."""
    return user["id"]


def is_demo_user(user: dict) -> bool:
    """The public demo account. Only the service role can set app_metadata, so users can't fake it."""
    return (user.get("app_metadata") or {}).get("demo") is True


async def reject_demo_user(user: dict = Depends(get_auth_user)) -> None:
    """For routes the demo account can't use: deleting the account, uploading files."""
    if is_demo_user(user):
        raise HTTPException(status_code=403, detail="The demo account can’t do that.")
