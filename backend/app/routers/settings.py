import logging

from fastapi import APIRouter, Depends

from app import db
from app.dependencies import get_current_user
from app.models.settings import DEFAULT_UNLIKELY_AFTER_DAYS, UserSettings, UserSettingsUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
async def get_user_settings(user_id: str = Depends(get_current_user)):
    """The user's settings. A user who has never saved any gets the defaults."""
    row = await db.pool().fetchrow(
        "SELECT unlikely_after_days FROM public.user_settings WHERE user_id = $1", user_id
    )
    if row is None:
        return {"data": UserSettings(unlikely_after_days=DEFAULT_UNLIKELY_AFTER_DAYS).model_dump(), "error": None}
    return {"data": UserSettings(**dict(row)).model_dump(), "error": None}


@router.patch("")
async def update_user_settings(
    payload: UserSettingsUpdate,
    user_id: str = Depends(get_current_user),
):
    """Saves the settings, creating the user's row the first time."""
    row = await db.pool().fetchrow(
        """
        INSERT INTO public.user_settings (user_id, unlikely_after_days) VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET unlikely_after_days = EXCLUDED.unlikely_after_days
        RETURNING unlikely_after_days
        """,
        user_id,
        payload.unlikely_after_days,
    )
    return {"data": UserSettings(**dict(row)).model_dump(), "error": None}
