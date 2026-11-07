"""Live checks against a Neon branch. See conftest.py."""
import httpx

from smoke.conftest import sql

PDF = ("resume.pdf", b"%PDF-1.4 smoke test", "application/pdf")


def test_a_neon_auth_token_reaches_the_backend(api, new_user):
    user = new_user()

    assert api.get("/settings", headers=user.headers()).json() == {"data": {"unlikely_after_days": 14}, "error": None}
    assert api.get("/account", headers=user.headers()).json() == {"data": {"is_demo": False}, "error": None}


def test_a_bad_token_is_refused(api, new_user):
    token = new_user().token()
    tampered = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")

    assert api.get("/settings", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_applications_files_and_account_deletion(api, new_user):
    user = new_user()
    headers = user.headers()

    created = api.post(
        "/applications",
        headers=headers,
        json={"job_title": "Smoke", "company": "Test Co", "date_applied": "2026-11-01"},
    )
    assert created.status_code == 201, created.text
    app_id = created.json()["data"]["id"]

    uploaded = api.post(f"/applications/{app_id}/resume", headers=headers, files={"file": PDF})
    assert uploaded.status_code == 200, uploaded.text

    resume_url = api.get(f"/applications/{app_id}", headers=headers).json()["data"]["resume_url"]
    download = httpx.get(resume_url, timeout=30)
    assert download.status_code == 200
    assert download.content == PDF[1]

    assert api.patch(f"/applications/{app_id}", headers=headers, json={"status": "Interviewing"}).status_code == 200
    history = api.get(f"/applications/{app_id}/history", headers=headers).json()["data"]
    assert [(h["old_status"], h["new_status"]) for h in history] == [(None, "Applied"), ("Applied", "Interviewing")]

    assert api.delete("/account", headers=headers).status_code == 204

    # The cascade through Neon Auth's tables and ours, and the file
    assert sql('SELECT count(*) AS n FROM neon_auth."user" WHERE id = $1', user.id)[0]["n"] == 0
    assert sql("SELECT count(*) AS n FROM neon_auth.session WHERE \"userId\" = $1", user.id)[0]["n"] == 0
    assert sql("SELECT count(*) AS n FROM applications WHERE user_id = $1", user.id)[0]["n"] == 0
    assert httpx.get(resume_url, timeout=30).status_code == 404
    # Neon Auth no longer knows the session
    assert user.request("GET", "/get-session").json() is None


def test_the_demo_account_stays_fixed(api, new_user):
    demo = new_user("Demo User")
    sql("INSERT INTO demo_users (user_id) VALUES ($1)", demo.id)
    headers = demo.headers()

    # Neon Auth reports success; the guard triggers undo the changes
    assert demo.request("POST", "/update-user", json={"name": "Hacked"}).status_code == 200
    changed = demo.request(
        "POST",
        "/change-password",
        json={"currentPassword": demo.password, "newPassword": "hacked-password", "revokeOtherSessions": False},
    )
    assert changed.status_code == 200, changed.text

    assert sql('SELECT name FROM neon_auth."user" WHERE id = $1', demo.id) == [{"name": "Demo User"}]
    demo.request("POST", "/sign-out", json={})
    assert demo.request("POST", "/sign-in/email", json={"email": demo.email, "password": "hacked-password"}).status_code == 401
    assert demo.request("POST", "/sign-in/email", json={"email": demo.email, "password": demo.password}).status_code == 200

    # And the backend treats it as the demo
    assert api.get("/account", headers=headers).json()["data"] == {"is_demo": True}
    assert api.delete("/account", headers=headers).status_code == 403
    assert sql("SELECT public.reset_demo_data() AS n")[0]["n"] >= 1
    assert len(api.get("/applications", headers=headers).json()["data"]) == 10


def test_neon_auth_still_refuses_email_changes_and_self_deletion(new_user):
    """Settings has no email change and the backend deletes accounts itself because of these."""
    user = new_user()

    changed = user.request("POST", "/change-email", json={"newEmail": f"new-{user.email}"})
    assert changed.status_code == 400
    assert changed.json()["code"] == "CHANGE_EMAIL_DISABLED"
    assert user.request("POST", "/delete-user", json={"password": user.password}).status_code == 404
