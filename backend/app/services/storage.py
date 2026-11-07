"""
Résumé and cover-letter PDFs in Neon Object Storage (S3-compatible), keyed
{user_id}/{application_id}/{resume|cover_letter}.pdf. The bucket is private; the browser only
ever sees presigned download URLs.
"""
import asyncio
import logging
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def _client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL_S3,
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        # Neon's endpoint takes the bucket in the path, not the hostname
        config=Config(s3={"addressing_style": "path"}, signature_version="s3v4"),
    )


def _bucket() -> str:
    return get_settings().STORAGE_BUCKET


async def upload_file(
    user_id: str,
    application_id: str,
    file_type: str,
    content: bytes,
    content_type: str,
) -> str:
    """
    Upload (or replace) a file. file_type must be 'resume' or 'cover_letter'.
    Returns the storage path on success. Raises HTTPException(500) on failure.
    """
    path = f"{user_id}/{application_id}/{file_type}.pdf"
    try:
        # boto3 is synchronous; keep it off the event loop
        await asyncio.to_thread(
            _client().put_object, Bucket=_bucket(), Key=path, Body=content, ContentType=content_type
        )
    except Exception as exc:
        logger.error("Storage upload error for path %s: %s", path, exc)
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")
    return path


async def delete_file(path: str) -> None:
    """Delete a file. Silently ignores errors, and a path that doesn't exist."""
    if not path:
        return
    try:
        await asyncio.to_thread(_client().delete_object, Bucket=_bucket(), Key=path)
    except Exception as exc:
        logger.warning("Storage delete failed for path %s: %s", path, exc)


async def get_signed_url(path: str, expires_in: int = 3600) -> Optional[str]:
    """A presigned download URL, valid for an hour by default. Returns None on any failure."""
    if not path:
        return None
    try:
        # Signing is local (no request), so it doesn't need a thread
        return _client().generate_presigned_url(
            "get_object", Params={"Bucket": _bucket(), "Key": path}, ExpiresIn=expires_in
        )
    except Exception as exc:
        logger.warning("Failed to create signed URL for path %s: %s", path, exc)
        return None
