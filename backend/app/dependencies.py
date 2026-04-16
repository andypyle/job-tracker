import httpx
from fastapi import Header, HTTPException

from app.config import get_settings


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    Verify the Supabase JWT from the Authorization header and return user_id.
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
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=401, detail="Could not verify token")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    data = response.json()
    user_id: str = data["id"]
    return user_id
