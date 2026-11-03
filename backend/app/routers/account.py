import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from app.config import get_settings
from app.dependencies import get_current_user
from app.services.storage import delete_file
from supabase import Client, create_client

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_admin_client() -> Client:
    """
    Service role client. Deleting an auth user needs it; it's only used here for the user_id
    taken from the verified JWT.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.delete("", status_code=204)
async def delete_account(user_id: str = Depends(get_current_user)):
    """
    Deletes the signed-in user. Their applications, status history and settings go with them
    (ON DELETE CASCADE); their uploaded files are removed from Storage afterwards.

    The user is deleted first, so a failure there leaves the account whole. The file paths are
    read before that, while the rows still exist.
    """
    admin_client = _get_admin_client()

    try:
        rows = (
            admin_client.table("applications")
            .select("resume_path, cover_letter_path")
            .eq("user_id", user_id)
            .execute()
        ).data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    paths = [path for row in rows for path in (row.get("resume_path"), row.get("cover_letter_path")) if path]

    try:
        admin_client.auth.admin.delete_user(user_id)
    except Exception as exc:
        logger.exception("delete_account: failed to delete user %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))

    # delete_file logs and swallows its own failures, so one stuck file doesn't fail the request
    for path in paths:
        await delete_file(path)

    logger.info("delete_account: deleted user %s and %d file(s)", user_id, len(paths))
    return Response(status_code=204)
