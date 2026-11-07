import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from app import db
from app.dependencies import get_current_user
from app.models.application import ApplicationCreate, ApplicationStatus, ApplicationUpdate
from app.services.storage import delete_file, get_signed_url

logger = logging.getLogger(__name__)

router = APIRouter()

NOT_FOUND = "Application not found"

# Every column a client may set. Inserts and updates build their SQL from these names only.
WRITABLE_COLUMNS = (
    "job_post_url",
    "job_title",
    "company",
    "company_logo_url",
    "industry",
    "compensation",
    "notes",
    "is_referral",
    "date_applied",
    "status",
)


def _writable(data: dict) -> dict:
    return {key: value for key, value in data.items() if key in WRITABLE_COLUMNS}


async def _history(conn, application_id: str, user_id: str) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT * FROM public.application_status_history
        WHERE application_id = $1 AND user_id = $2
        ORDER BY changed_at
        """,
        application_id,
        user_id,
    )
    return [dict(row) for row in rows]


async def _record_status(conn, application_id: str, user_id: str, old_status: Optional[str], new_status: str) -> None:
    await conn.execute(
        """
        INSERT INTO public.application_status_history (application_id, user_id, old_status, new_status, is_automatic)
        VALUES ($1, $2, $3, $4, false)
        """,
        application_id,
        user_id,
        old_status,
        new_status,
    )


@router.get("")
async def list_applications(
    status: Optional[ApplicationStatus] = None,
    user_id: str = Depends(get_current_user),
):
    rows = await db.pool().fetch(
        """
        SELECT * FROM public.applications
        WHERE user_id = $1 AND ($2::public.application_status IS NULL OR status = $2::public.application_status)
        ORDER BY date_applied DESC, created_at DESC
        """,
        user_id,
        status.value if status else None,
    )
    return {"data": [dict(row) for row in rows], "error": None}


@router.get("/{application_id}/history")
async def get_application_history(
    application_id: str,
    user_id: str = Depends(get_current_user),
):
    if not db.is_uuid(application_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    async with db.pool().acquire() as conn:
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM public.applications WHERE id = $1 AND user_id = $2)",
            application_id,
            user_id,
        )
        if not exists:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        history = await _history(conn, application_id, user_id)

    return {"data": history, "error": None}


@router.get("/{application_id}")
async def get_application(
    application_id: str,
    user_id: str = Depends(get_current_user),
):
    if not db.is_uuid(application_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    async with db.pool().acquire() as conn:
        row = db.as_dict(
            await conn.fetchrow(
                "SELECT * FROM public.applications WHERE id = $1 AND user_id = $2",
                application_id,
                user_id,
            )
        )
        if not row:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        row["status_history"] = await _history(conn, application_id, user_id)

    row["resume_url"] = await get_signed_url(row["resume_path"]) if row.get("resume_path") else None
    row["cover_letter_url"] = await get_signed_url(row["cover_letter_path"]) if row.get("cover_letter_path") else None

    return {"data": row, "error": None}


@router.post("", status_code=201)
async def create_application(
    payload: ApplicationCreate,
    user_id: str = Depends(get_current_user),
):
    data = _writable(payload.model_dump())
    data["status"] = payload.status.value  # Applied unless the client chose another
    columns = list(data)

    async with db.pool().acquire() as conn, conn.transaction():
        row = dict(
            await conn.fetchrow(
                f"""
                INSERT INTO public.applications (user_id, {", ".join(columns)})
                VALUES ($1, {", ".join(f"${i}" for i in range(2, len(columns) + 2))})
                RETURNING *
                """,
                user_id,
                *data.values(),
            )
        )
        # The creation entry: a NULL old_status
        await _record_status(conn, row["id"], user_id, None, row["status"])
        row["status_history"] = await _history(conn, row["id"], user_id)

    row["resume_url"] = None
    row["cover_letter_url"] = None
    return {"data": row, "error": None}


@router.patch("/{application_id}")
async def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    user_id: str = Depends(get_current_user),
):
    # Only the fields the client sent
    data = _writable(payload.model_dump(exclude_unset=True))
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    if data.get("status") is not None:
        data["status"] = data["status"].value

    if not db.is_uuid(application_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    async with db.pool().acquire() as conn, conn.transaction():
        # Lock the row so the status we compare against can't change underneath us
        old_status = await conn.fetchval(
            "SELECT status FROM public.applications WHERE id = $1 AND user_id = $2 FOR UPDATE",
            application_id,
            user_id,
        )
        if old_status is None:
            raise HTTPException(status_code=404, detail=NOT_FOUND)

        assignments = ", ".join(f"{column} = ${i}" for i, column in enumerate(data, start=3))
        row = dict(
            await conn.fetchrow(
                f"UPDATE public.applications SET {assignments} WHERE id = $1 AND user_id = $2 RETURNING *",
                application_id,
                user_id,
                *data.values(),
            )
        )

        new_status = data.get("status")
        if new_status is not None and new_status != old_status:
            await _record_status(conn, application_id, user_id, old_status, new_status)

    row["resume_url"] = None
    row["cover_letter_url"] = None
    return {"data": row, "error": None}


@router.delete("/{application_id}", status_code=204)
async def delete_application(
    application_id: str,
    user_id: str = Depends(get_current_user),
):
    if not db.is_uuid(application_id):
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    # Status history goes with the row (ON DELETE CASCADE)
    row = await db.pool().fetchrow(
        """
        DELETE FROM public.applications WHERE id = $1 AND user_id = $2
        RETURNING resume_path, cover_letter_path
        """,
        application_id,
        user_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    # Files go after the row, so a storage failure can't leave a row pointing at nothing
    for path in (row["resume_path"], row["cover_letter_path"]):
        if path:
            await delete_file(path)

    return Response(status_code=204)
