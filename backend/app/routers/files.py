import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Response, UploadFile
from supabase import Client, create_client

from app.config import get_settings
from app.dependencies import get_current_user
from app.services.storage import delete_file, upload_file

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_user_client(authorization: str) -> Client:
    """Return a Supabase client scoped to the requesting user (RLS enforced)."""
    settings = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client


def _verify_application_ownership(client: Client, application_id: str, user_id: str) -> dict:
    """
    Verify the application exists and belongs to user_id.
    Returns the application row.
    Raises HTTPException(404) if not found or not owned.
    """
    try:
        result = (
            client.table("applications")
            .select("id, resume_path, cover_letter_path")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    return result.data


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
    authorization: str,
    user_id: str,
):
    """
    Shared logic for resume and cover_letter uploads.
    Returns a JSON-serialisable response dict.
    """
    client = _get_user_client(authorization)
    _verify_application_ownership(client, application_id, user_id)

    content = await _validate_upload(file)

    path = await upload_file(
        user_id=user_id,
        application_id=application_id,
        file_type=file_type,
        content=content,
        content_type="application/pdf",
    )

    # Persist the path back to the applications row
    field = f"{file_type}_path"
    try:
        client.table("applications").update({field: path}).eq("id", application_id).eq(
            "user_id", user_id
        ).execute()
    except Exception as exc:
        logger.error("Failed to update %s for application %s: %s", field, application_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update application record")

    return {"data": {"path": path}, "error": None}


async def _delete_file_for_application(
    application_id: str,
    file_type: str,
    authorization: str,
    user_id: str,
) -> Response:
    """
    Shared logic for resume and cover_letter deletions.
    Returns a 204 No Content response.
    """
    client = _get_user_client(authorization)
    app_row = _verify_application_ownership(client, application_id, user_id)

    field = f"{file_type}_path"
    existing_path = app_row.get(field)

    if existing_path:
        await delete_file(existing_path)

    # Null out the path in the DB regardless of whether a file existed
    try:
        client.table("applications").update({field: None}).eq("id", application_id).eq(
            "user_id", user_id
        ).execute()
    except Exception as exc:
        logger.error("Failed to clear %s for application %s: %s", field, application_id, exc)
        raise HTTPException(status_code=500, detail="Failed to update application record")

    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Resume routes
# ---------------------------------------------------------------------------


@router.post("/{application_id}/resume", status_code=200)
async def upload_resume(
    application_id: str,
    file: UploadFile,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    return await _upload_file_for_application(
        application_id=application_id,
        file_type="resume",
        file=file,
        authorization=authorization,
        user_id=user_id,
    )


@router.delete("/{application_id}/resume", status_code=204)
async def delete_resume(
    application_id: str,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    return await _delete_file_for_application(
        application_id=application_id,
        file_type="resume",
        authorization=authorization,
        user_id=user_id,
    )


# ---------------------------------------------------------------------------
# Cover letter routes
# ---------------------------------------------------------------------------


@router.post("/{application_id}/cover_letter", status_code=200)
async def upload_cover_letter(
    application_id: str,
    file: UploadFile,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    return await _upload_file_for_application(
        application_id=application_id,
        file_type="cover_letter",
        file=file,
        authorization=authorization,
        user_id=user_id,
    )


@router.delete("/{application_id}/cover_letter", status_code=204)
async def delete_cover_letter(
    application_id: str,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    return await _delete_file_for_application(
        application_id=application_id,
        file_type="cover_letter",
        authorization=authorization,
        user_id=user_id,
    )
