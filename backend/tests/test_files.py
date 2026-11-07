"""Tests for résumé and cover-letter upload and delete routes. Object Storage is patched."""
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import make_application, make_demo_user, make_user, sql
from app.dependencies import get_current_user
from app.main import app

PDF = ("resume.pdf", b"%PDF-1.4 test", "application/pdf")


@pytest.mark.parametrize("file_type", ["resume", "cover_letter"])
def test_upload_stores_the_file_and_its_path(client, user_id, file_type):
    app_id = make_application(user_id)
    expected_path = f"{user_id}/{app_id}/{file_type}.pdf"

    with patch("app.routers.files.upload_file", new_callable=AsyncMock, return_value=expected_path) as upload:
        resp = client.post(f"/applications/{app_id}/{file_type}", files={"file": PDF})

    assert resp.status_code == 200
    assert resp.json() == {"data": {"path": expected_path}, "error": None}
    upload.assert_awaited_once()
    assert upload.await_args.kwargs["user_id"] == user_id
    assert upload.await_args.kwargs["file_type"] == file_type
    assert sql(f"SELECT {file_type}_path AS path FROM applications WHERE id = $1", app_id)[0]["path"] == expected_path


def test_upload_rejects_non_pdf(client, user_id):
    app_id = make_application(user_id)

    with patch("app.routers.files.upload_file", new_callable=AsyncMock) as upload:
        resp = client.post(f"/applications/{app_id}/resume", files={"file": ("notes.txt", b"hi", "text/plain")})

    assert resp.status_code == 400
    upload.assert_not_awaited()


def test_upload_rejects_oversized_file(client, user_id):
    app_id = make_application(user_id)
    big = b"%PDF" + b"0" * (10 * 1024 * 1024)

    with patch("app.routers.files.upload_file", new_callable=AsyncMock) as upload:
        resp = client.post(f"/applications/{app_id}/resume", files={"file": ("big.pdf", big, "application/pdf")})

    assert resp.status_code == 413
    upload.assert_not_awaited()


def test_upload_to_another_users_application_is_not_found(client):
    other = make_application(make_user("other@example.com"))

    with patch("app.routers.files.upload_file", new_callable=AsyncMock) as upload:
        resp = client.post(f"/applications/{other}/resume", files={"file": PDF})

    assert resp.status_code == 404
    upload.assert_not_awaited()


@pytest.mark.parametrize("file_type", ["resume", "cover_letter"])
def test_upload_refuses_the_demo_account(client, file_type):
    demo_id = make_demo_user()
    app_id = make_application(demo_id)
    app.dependency_overrides[get_current_user] = lambda: demo_id

    with patch("app.routers.files.upload_file", new_callable=AsyncMock) as upload:
        resp = client.post(f"/applications/{app_id}/{file_type}", files={"file": PDF})

    assert resp.status_code == 403
    upload.assert_not_awaited()


@pytest.mark.parametrize("file_type", ["resume", "cover_letter"])
def test_delete_file_removes_it_and_nulls_the_path(client, user_id, file_type):
    path = f"{user_id}/x/{file_type}.pdf"
    app_id = make_application(user_id, **{f"{file_type}_path": path})

    with patch("app.routers.files.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete(f"/applications/{app_id}/{file_type}")

    assert resp.status_code == 204
    delete_file.assert_awaited_once_with(path)
    assert sql(f"SELECT {file_type}_path AS path FROM applications WHERE id = $1", app_id)[0]["path"] is None


def test_delete_file_without_a_file_still_succeeds(client, user_id):
    app_id = make_application(user_id)

    with patch("app.routers.files.delete_file", new_callable=AsyncMock) as delete_file:
        resp = client.delete(f"/applications/{app_id}/resume")

    assert resp.status_code == 204
    delete_file.assert_not_awaited()
