import logging

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile

from app import db
from app.dependencies import get_current_user, reject_demo_user
from app.services.storage import delete_file, upload_file

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def _verify_application_ownership(application_id: str, user_id: str) -> dict:
    """
    The application's file paths, if it exists and belongs to user_id.
    Raises HTTPException(404) if not found or not owned.
    """
    row = None
    if db.is_uuid(application_id):
        row = await db.pool().fetchrow(
            "SELECT id, resume_path, cover_letter_path FROM public.applications WHERE id = $1 AND user_id = $2",
            application_id,
            user_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return dict(row)


async def _set_path(application_id: str, user_id: str, field: str, path) -> None:
    """Store (or clear) a file path. field is resume_path or cover_letter_path, never user input."""
    try:
        await db.pool().execute(
            f"UPDATE public.applications SET {field} = $3 WHERE id = $1 AND user_id = $2",
            application_id,
            user_id,
            path,
        )
    except Exception as exc:
        logger.error("Failed to update %s for application %s: %s", field, application_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update application record")


async def _validate_upload(file: UploadFile) -> bytes:
    """
    Read and validate an uploaded file.
    Raises HTTPException(400) for non-PDF, HTTPException(413) for oversized files.
    Returns the raw bytes.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB size limit")

    return content


async def _upload_file_for_application(
    application_id: str,
    file_type: str,
    file: UploadFile,
    user_id: str,
):
    """
    Shared logic for resume and cover_letter uploads.
    Returns a JSON-serialisable response dict.
    """
    await _verify_application_ownership(application_id, user_id)

    content = await _validate_upload(file)

    path = await upload_file(
        user_id=user_id,
        application_id=application_id,
        file_type=file_type,
        content=content,
        content_type="application/pdf",
    )

    # Persist the path back to the applications row
    await _set_path(application_id, user_id, f"{file_type}_path", path)

    return {"data": {"path": path}, "error": None}


async def _delete_file_for_application(
    application_id: str,
    file_type: str,
    user_id: str,
) -> Response:
    """
    Shared logic for resume and cover_letter deletions.
    Returns a 204 No Content response.
    """
    app_row = await _verify_application_ownership(application_id, user_id)

    field = f"{file_type}_path"
    existing_path = app_row.get(field)

    if existing_path:
        await delete_file(existing_path)

    # Null out the path in the DB regardless of whether a file existed
    await _set_path(application_id, user_id, field, None)

    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Resume routes
# ---------------------------------------------------------------------------


@router.post("/{application_id}/resume", status_code=200, dependencies=[Depends(reject_demo_user)])
async def upload_resume(
    application_id: str,
    file: UploadFile,
    user_id: str = Depends(get_current_user),
):
    return await _upload_file_for_application(
        application_id=application_id,
        file_type="resume",
        file=file,
        user_id=user_id,
    )


@router.delete("/{application_id}/resume", status_code=204)
async def delete_resume(
    application_id: str,
    user_id: str = Depends(get_current_user),
):
    return await _delete_file_for_application(
        application_id=application_id,
        file_type="resume",
        user_id=user_id,
    )


# ---------------------------------------------------------------------------
# Cover letter routes
# ---------------------------------------------------------------------------


@router.post("/{application_id}/cover_letter", status_code=200, dependencies=[Depends(reject_demo_user)])
async def upload_cover_letter(
    application_id: str,
    file: UploadFile,
    user_id: str = Depends(get_current_user),
):
    return await _upload_file_for_application(
        application_id=application_id,
        file_type="cover_letter",
        file=file,
        user_id=user_id,
    )


@router.delete("/{application_id}/cover_letter", status_code=204)
async def delete_cover_letter(
    application_id: str,
    user_id: str = Depends(get_current_user),
):
    return await _delete_file_for_application(
        application_id=application_id,
        file_type="cover_letter",
        user_id=user_id,
    )
