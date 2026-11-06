"""
Tests for file upload/delete routes under /applications/{id}/resume
and /applications/{id}/cover_letter.

All Supabase and storage calls are mocked.
"""
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import TEST_APP_ID, TEST_USER_ID

AUTH_HEADER = {"Authorization": "Bearer fake-token"}

# 1 byte under the 10MB limit
VALID_PDF_SIZE = 1024  # 1 KB
OVERSIZED_PDF_SIZE = (10 * 1024 * 1024) + 1  # 10MB + 1 byte


def _make_ownership_mock(
    application_id: str = TEST_APP_ID,
    user_id: str = TEST_USER_ID,
    resume_path: str = None,
    cover_letter_path: str = None,
    raise_exc=None,
):
    """Build a mock Supabase client that returns an ownership check result."""
    row = {
        "id": application_id,
        "resume_path": resume_path,
        "cover_letter_path": cover_letter_path,
    }

    execute_mock = MagicMock()
    if raise_exc:
        execute_mock.side_effect = raise_exc
    else:
        result = MagicMock()
        result.data = row
        execute_mock.return_value = result

    update_execute = MagicMock()
    update_result = MagicMock()
    update_result.data = [row]
    update_execute.return_value = update_result

    chain = MagicMock()
    chain.execute = execute_mock
    chain.eq = MagicMock(return_value=chain)
    chain.single = MagicMock(return_value=chain)

    update_chain = MagicMock()
    update_chain.execute = update_execute
    update_chain.eq = MagicMock(return_value=update_chain)

    table_mock = MagicMock()
    table_mock.select = MagicMock(return_value=chain)
    table_mock.update = MagicMock(return_value=update_chain)

    client_mock = MagicMock()
    client_mock.table = MagicMock(return_value=table_mock)
    client_mock.postgrest = MagicMock()

    return client_mock


# ---------------------------------------------------------------------------
# Upload validation
# ---------------------------------------------------------------------------


def test_upload_rejects_non_pdf(client):
    """POST /{id}/resume with a non-PDF content_type returns 400."""
    client_mock = _make_ownership_mock()

    with patch("app.routers.files.create_client", return_value=client_mock):
        resp = client.post(
            f"/applications/{TEST_APP_ID}/resume",
            headers=AUTH_HEADER,
            files={"file": ("resume.txt", io.BytesIO(b"not a pdf"), "text/plain")},
        )

    assert resp.status_code == 400
    assert "pdf" in resp.json()["detail"].lower()


def test_upload_rejects_oversized_file(client):
    """POST /{id}/resume with a file > 10MB returns 413."""
    oversized_content = b"%PDF-1.4" + b"x" * OVERSIZED_PDF_SIZE
    client_mock = _make_ownership_mock()

    with patch("app.routers.files.create_client", return_value=client_mock):
        resp = client.post(
            f"/applications/{TEST_APP_ID}/resume",
            headers=AUTH_HEADER,
            files={"file": ("resume.pdf", io.BytesIO(oversized_content), "application/pdf")},
        )

    assert resp.status_code == 413
    assert "10" in resp.json()["detail"] or "size" in resp.json()["detail"].lower()


@pytest.mark.parametrize("file_type", ["resume", "cover_letter"])
def test_upload_refuses_the_demo_account(client, mock_auth_user, file_type):
    mock_auth_user["app_metadata"]["demo"] = True
    client_mock = _make_ownership_mock()

    with (
        patch("app.routers.files.create_client", return_value=client_mock),
        patch("app.routers.files.upload_file", new_callable=AsyncMock) as upload,
    ):
        resp = client.post(
            f"/applications/{TEST_APP_ID}/{file_type}",
            headers=AUTH_HEADER,
            files={"file": ("file.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        )

    assert resp.status_code == 403
    upload.assert_not_called()


def test_upload_succeeds_for_valid_pdf(client):
    """POST /{id}/resume with a valid PDF stores at {user_id}/{app_id}/resume.pdf."""
    pdf_content = b"%PDF-1.4" + b"x" * VALID_PDF_SIZE
    client_mock = _make_ownership_mock()

    expected_path = f"{TEST_USER_ID}/{TEST_APP_ID}/resume.pdf"

    with (
        patch("app.routers.files.create_client", return_value=client_mock),
        patch(
            "app.routers.files.upload_file",
            new_callable=AsyncMock,
            return_value=expected_path,
        ) as mock_upload,
    ):
        resp = client.post(
            f"/applications/{TEST_APP_ID}/resume",
            headers=AUTH_HEADER,
            files={"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["path"] == expected_path

    # Verify correct path format was returned from upload_file
    mock_upload.assert_called_once()
    call_kwargs = mock_upload.call_args.kwargs
    assert call_kwargs["user_id"] == TEST_USER_ID
    assert call_kwargs["application_id"] == TEST_APP_ID
    assert call_kwargs["file_type"] == "resume"


# ---------------------------------------------------------------------------
# Delete file route
# ---------------------------------------------------------------------------


def test_delete_file_nulls_path_in_db(client):
    """DELETE /{id}/resume nulls out resume_path in the applications table."""
    existing_resume_path = f"{TEST_USER_ID}/{TEST_APP_ID}/resume.pdf"
    client_mock = _make_ownership_mock(resume_path=existing_resume_path)

    with (
        patch("app.routers.files.create_client", return_value=client_mock),
        patch(
            "app.routers.files.delete_file",
            new_callable=AsyncMock,
        ) as mock_delete,
    ):
        resp = client.delete(
            f"/applications/{TEST_APP_ID}/resume",
            headers=AUTH_HEADER,
        )

    assert resp.status_code == 204

    # delete_file should have been called with the existing path
    mock_delete.assert_called_once_with(existing_resume_path)

    # The update call should have set resume_path to None
    table = client_mock.table.return_value
    update_call_args = table.update.call_args
    assert update_call_args is not None
    update_data = update_call_args[0][0]
    assert update_data.get("resume_path") is None


def test_delete_cover_letter_nulls_path_in_db(client):
    """DELETE /{id}/cover_letter nulls out cover_letter_path in the applications table."""
    existing_cover_path = f"{TEST_USER_ID}/{TEST_APP_ID}/cover_letter.pdf"
    client_mock = _make_ownership_mock(cover_letter_path=existing_cover_path)

    with (
        patch("app.routers.files.create_client", return_value=client_mock),
        patch(
            "app.routers.files.delete_file",
            new_callable=AsyncMock,
        ) as mock_delete,
    ):
        resp = client.delete(
            f"/applications/{TEST_APP_ID}/cover_letter",
            headers=AUTH_HEADER,
        )

    assert resp.status_code == 204
    mock_delete.assert_called_once_with(existing_cover_path)

    table = client_mock.table.return_value
    update_call_args = table.update.call_args
    update_data = update_call_args[0][0]
    assert update_data.get("cover_letter_path") is None
