import logging

from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import get_settings
from app.dependencies import get_current_user
from app.models.settings import DEFAULT_UNLIKELY_AFTER_DAYS, UserSettings, UserSettingsUpdate
from supabase import Client, create_client

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_user_client(authorization: str) -> Client:
    """A Supabase client scoped to the requesting user, so RLS applies."""
    settings = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client


@router.get("")
async def get_user_settings(
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    """The user's settings. A user who has never saved any gets the defaults."""
    client = _get_user_client(authorization)
    try:
        result = (
            client.table("user_settings")
            .select("unlikely_after_days")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    rows = result.data or []
    if not rows:
        return {"data": UserSettings(unlikely_after_days=DEFAULT_UNLIKELY_AFTER_DAYS).model_dump(), "error": None}
    return {"data": UserSettings(**rows[0]).model_dump(), "error": None}


@router.patch("")
async def update_user_settings(
    payload: UserSettingsUpdate,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    """Saves the settings, creating the user's row the first time."""
    client = _get_user_client(authorization)
    try:
        result = (
            client.table("user_settings")
            .upsert({"user_id": user_id, **payload.model_dump()}, on_conflict="user_id")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save settings")

    return {"data": UserSettings(**result.data[0]).model_dump(), "error": None}
