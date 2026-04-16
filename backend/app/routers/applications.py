from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from app.config import get_settings
from app.dependencies import get_current_user
from app.models.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatus,
    ApplicationUpdate,
)
from app.services.storage import delete_file, get_signed_url
from supabase import Client, create_client

router = APIRouter()


def _get_user_client(authorization: str) -> Client:
    """
    Return a Supabase client scoped to the requesting user.
    We pass the user's JWT so that Supabase RLS policies are enforced
    against the correct user_id without any extra filtering on our side.
    """
    settings = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client




@router.get("")
async def list_applications(
    status: Optional[ApplicationStatus] = None,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    client = _get_user_client(authorization)

    try:
        query = (
            client.table("applications")
            .select("*")
            .eq("user_id", user_id)
            .order("date_applied", desc=True)
            .order("created_at", desc=True)
        )
        if status is not None:
            query = query.eq("status", status.value)

        result = query.execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"data": result.data, "error": None}


@router.get("/{application_id}")
async def get_application(
    application_id: str,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    client = _get_user_client(authorization)
    try:
        result = (
            client.table("applications")
            .select("*")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        # supabase-py raises when .single() finds no rows
        raise HTTPException(status_code=404, detail="Application not found")

    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")

    # Generate signed URLs for any attached files
    row["resume_url"] = await get_signed_url(row["resume_path"]) if row.get("resume_path") else None
    row["cover_letter_url"] = await get_signed_url(row["cover_letter_path"]) if row.get("cover_letter_path") else None

    return {"data": row, "error": None}


@router.post("", status_code=201)
async def create_application(
    payload: ApplicationCreate,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    client = _get_user_client(authorization)

    insert_data = payload.model_dump()
    # Supabase expects ISO string for date
    insert_data["date_applied"] = insert_data["date_applied"].isoformat()
    insert_data["user_id"] = user_id
    insert_data["status"] = ApplicationStatus.Applied.value  # always Applied on creation

    try:
        result = client.table("applications").insert(insert_data).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create application")

    row = result.data[0]
    row.setdefault("resume_url", None)
    row.setdefault("cover_letter_url", None)

    return {"data": row, "error": None}


@router.patch("/{application_id}")
async def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    client = _get_user_client(authorization)

    # Verify ownership before updating
    try:
        existing = (
            client.table("applications")
            .select("id")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")

    # Only include fields that were explicitly provided
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # Serialize types that supabase-py won't handle automatically
    if "date_applied" in update_data and update_data["date_applied"] is not None:
        update_data["date_applied"] = update_data["date_applied"].isoformat()
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value

    try:
        result = (
            client.table("applications")
            .update(update_data)
            .eq("id", application_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    row = result.data[0]
    row.setdefault("resume_url", None)
    row.setdefault("cover_letter_url", None)

    return {"data": row, "error": None}


@router.delete("/{application_id}", status_code=204)
async def delete_application(
    application_id: str,
    authorization: str = Header(...),
    user_id: str = Depends(get_current_user),
):
    client = _get_user_client(authorization)

    # Verify ownership and fetch file paths before deleting
    try:
        existing = (
            client.table("applications")
            .select("id, resume_path, cover_letter_path")
            .eq("id", application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    if not existing.data:
        raise HTTPException(status_code=404, detail="Application not found")

    # Clean up associated files from Storage before removing the DB row
    row = existing.data
    if row.get("resume_path"):
        await delete_file(row["resume_path"])
    if row.get("cover_letter_path"):
        await delete_file(row["cover_letter_path"])

    try:
        client.table("applications").delete().eq("id", application_id).eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return Response(status_code=204)
