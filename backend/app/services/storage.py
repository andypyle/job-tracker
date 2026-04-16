import logging
from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)

BUCKET = "application-files"


def _storage_headers() -> dict:
    """Auth headers for the Supabase Storage REST API."""
    key = get_settings().SUPABASE_SERVICE_ROLE_KEY
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }


def _storage_base_url() -> str:
    return f"{get_settings().SUPABASE_URL}/storage/v1"


async def upload_file(
    user_id: str,
    application_id: str,
    file_type: str,
    content: bytes,
    content_type: str,
) -> str:
    """
    Upload a file to the application-files bucket via the Storage REST API.
    file_type must be 'resume' or 'cover_letter'.
    Returns the storage path on success. Raises HTTPException(500) on failure.
    """
    path = f"{user_id}/{application_id}/{file_type}.pdf"
    url = f"{_storage_base_url()}/object/{BUCKET}/{path}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                content=content,
                headers={
                    **_storage_headers(),
                    "Content-Type": content_type,
                    "x-upsert": "true",
                },
            )
        if response.status_code not in (200, 201):
            logger.error("Storage upload failed for path %s: %s", path, response.text)
            raise HTTPException(status_code=500, detail="Failed to upload file to storage")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Storage upload error for path %s: %s", path, exc)
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    return path


async def delete_file(path: str) -> None:
    """
    Delete a file from the application-files bucket. Silently ignores errors.
    """
    if not path:
        return
    url = f"{_storage_base_url()}/object/{BUCKET}/{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.delete(url, headers=_storage_headers())
    except Exception as exc:
        logger.warning("Storage delete failed for path %s: %s", path, exc)


async def get_signed_url(path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generate a signed URL for a storage path. Returns None on any failure.
    """
    if not path:
        return None
    url = f"{_storage_base_url()}/object/sign/{BUCKET}/{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"expiresIn": expires_in},
                headers={**_storage_headers(), "Content-Type": "application/json"},
            )
        if response.status_code != 200:
            return None
        data = response.json()
        signed_path = data.get("signedURL") or data.get("signedUrl") or data.get("signed_url")
        if not signed_path:
            return None
        # Prepend base URL + /storage/v1 if the response only returns a path
        if signed_path.startswith("/"):
            return f"{get_settings().SUPABASE_URL}/storage/v1{signed_path}"
        return signed_path
    except Exception as exc:
        logger.warning("Failed to create signed URL for path %s: %s", path, exc)
        return None
