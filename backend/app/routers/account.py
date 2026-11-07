import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from app import db
from app.dependencies import get_current_user, is_demo_user, reject_demo_user
from app.services.storage import delete_file

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
async def get_account(user_id: str = Depends(get_current_user)):
    """
    What the backend knows about the signed-in user beyond their Neon Auth profile. For now,
    whether they're the public demo, which the frontend can't tell from the JWT.
    """
    return {"data": {"is_demo": await is_demo_user(user_id)}, "error": None}


@router.delete("", status_code=204, dependencies=[Depends(reject_demo_user)])
async def delete_account(user_id: str = Depends(get_current_user)):
    """
    Deletes the signed-in user from Neon Auth. Their sessions, applications, status history and
    settings go with them (ON DELETE CASCADE); their uploaded files are removed afterwards.

    Neon Auth doesn't let users delete themselves, so this deletes the neon_auth.user row directly.
    The user is deleted first, so a failure there leaves the account whole; the file paths come
    back from the same transaction, read before the cascade removes the rows. Their current JWT
    stays valid until it expires (15 minutes), but there's nothing left for it to reach.
    """
    try:
        async with db.pool().acquire() as conn, conn.transaction():
            rows = await conn.fetch(
                "SELECT resume_path, cover_letter_path FROM public.applications WHERE user_id = $1",
                user_id,
            )
            await conn.execute('DELETE FROM neon_auth."user" WHERE id = $1', user_id)
    except Exception as exc:
        logger.exception("delete_account: failed to delete user %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))

    paths = [path for row in rows for path in (row["resume_path"], row["cover_letter_path"]) if path]

    # delete_file logs and swallows its own failures, so one stuck file doesn't fail the request
    for path in paths:
        await delete_file(path)

    logger.info("delete_account: deleted user %s and %d file(s)", user_id, len(paths))
    return Response(status_code=204)
