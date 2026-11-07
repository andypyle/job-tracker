#!/usr/bin/env python3
"""
Copy one user's data from the old Supabase project into a Neon branch: their applications,
status history, settings, and résumé and cover-letter PDFs. Run it with the backend's venv
(asyncpg, boto3, httpx):

    backend/.venv/bin/python scripts/import_from_supabase.py --email you@example.com [--dry-run]

Reads Supabase with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from --supabase-env (default
backend/.env.local); it never writes there. Writes to the Neon branch in --neon-env (default
backend/.env): DATABASE_URL, STORAGE_BUCKET and the AWS_* storage settings.

The user must already exist on the Neon branch: sign up there with the same email first (passwords
can't move). Their new Neon id replaces the Supabase one everywhere, including in file paths.
Rows keep their ids, so running it again updates what's there instead of duplicating it, and
files already copied with the same size are skipped. --dry-run reads both sides and reports what
it would do, without writing.
"""
import argparse
import asyncio
import sys
from datetime import date, datetime
from pathlib import Path

import asyncpg
import boto3
import httpx
from botocore.config import Config
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
SUPABASE_BUCKET = "application-files"

APPLICATION_COLUMNS = (
    "id", "job_post_url", "job_title", "company", "company_logo_url", "industry", "compensation",
    "is_referral", "resume_path", "cover_letter_path", "date_applied", "status", "notes",
    "created_at", "updated_at",
)
HISTORY_COLUMNS = ("id", "application_id", "old_status", "new_status", "changed_at", "is_automatic")


def read_env(path: Path) -> dict[str, str]:
    """A .env file's KEY=value lines, with optional quotes. Comments and blanks are skipped."""
    if not path.exists():
        sys.exit(f"{path} doesn't exist")
    values = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def require(env: dict[str, str], keys: tuple[str, ...], source: Path) -> None:
    missing = [key for key in keys if not env.get(key)]
    if missing:
        sys.exit(f"{source} is missing {', '.join(missing)}")


class Supabase:
    """Read-only access with the service role key (bypasses RLS)."""

    def __init__(self, url: str, key: str):
        if "127.0.0.1" in url or "localhost" in url:
            sys.exit(f"SUPABASE_URL is {url}: that's a local Supabase, not production")
        self.url = url.rstrip("/")
        # A legacy service_role key is a JWT and also goes in Authorization; a newer sb_secret_
        # key only goes in apikey, and Supabase rejects it as a Bearer token
        headers = {"apikey": key}
        if key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {key}"
        self.http = httpx.Client(headers=headers, timeout=60)

    def find_user(self, email: str) -> dict:
        page = 1
        while True:
            response = self.http.get(f"{self.url}/auth/v1/admin/users", params={"page": page, "per_page": 200})
            response.raise_for_status()
            users = response.json().get("users", [])
            for user in users:
                if (user.get("email") or "").lower() == email.lower():
                    return user
            if len(users) < 200:
                sys.exit(f"No Supabase user with the email {email}")
            page += 1

    def rows(self, table: str, user_id: str) -> list[dict]:
        """Every row of a table for one user, a page at a time."""
        rows, start, size = [], 0, 1000
        while True:
            params = {"select": "*", "user_id": f"eq.{user_id}"}
            if table == "applications":
                params["order"] = "created_at.asc"
            response = self.http.get(
                f"{self.url}/rest/v1/{table}",
                params=params,
                headers={"Range": f"{start}-{start + size - 1}"},
            )
            response.raise_for_status()
            page = response.json()
            rows += page
            if len(page) < size:
                return rows
            start += size

    def download(self, path: str) -> bytes:
        response = self.http.get(f"{self.url}/storage/v1/object/{SUPABASE_BUCKET}/{path}")
        response.raise_for_status()
        return response.content


def new_path(path: str | None, old_id: str, new_id: str) -> str | None:
    """{old_id}/{application_id}/{type}.pdf -> {new_id}/{application_id}/{type}.pdf"""
    if not path:
        return None
    prefix = f"{old_id}/"
    return new_id + "/" + path[len(prefix):] if path.startswith(prefix) else path


def parse(value, kind: str):
    """PostgREST returns ISO strings; asyncpg wants dates and datetimes."""
    if value is None:
        return None
    if kind == "date":
        return date.fromisoformat(value)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True, help="The user's email in Supabase")
    parser.add_argument("--neon-email", help="Their email on Neon, if different")
    parser.add_argument("--supabase-env", type=Path, default=ROOT / "backend" / ".env.local")
    parser.add_argument("--neon-env", type=Path, default=ROOT / "backend" / ".env")
    parser.add_argument("--dry-run", action="store_true", help="Read and report; write nothing")
    args = parser.parse_args()

    supabase_env = read_env(args.supabase_env)
    require(supabase_env, ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"), args.supabase_env)
    neon_env = read_env(args.neon_env)
    require(neon_env, ("DATABASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"), args.neon_env)
    bucket = neon_env.get("STORAGE_BUCKET", "application-files")

    supabase = Supabase(supabase_env["SUPABASE_URL"], supabase_env["SUPABASE_SERVICE_ROLE_KEY"])
    old_user = supabase.find_user(args.email)
    old_id = old_user["id"]
    applications = supabase.rows("applications", old_id)
    history = supabase.rows("application_status_history", old_id)
    settings = supabase.rows("user_settings", old_id)
    files = [
        (path, kind)
        for application in applications
        for kind in ("resume_path", "cover_letter_path")
        if (path := application.get(kind))
    ]

    neon_host = neon_env["DATABASE_URL"].split("@")[-1].split("/")[0]
    print(f"From Supabase {supabase.url} (user {old_user['email']})")
    print(f"To Neon {neon_host}")
    print(f"  {len(applications)} applications, {len(history)} status changes, "
          f"{'a settings row' if settings else 'no settings row (default 14 days)'}, {len(files)} files")

    conn = await asyncpg.connect(neon_env["DATABASE_URL"], statement_cache_size=0)
    try:
        new_id = await conn.fetchval('SELECT id::text FROM neon_auth."user" WHERE lower(email) = lower($1)', args.neon_email or args.email)
        if not new_id:
            message = f"No Neon user with the email {args.neon_email or args.email}: sign up on that branch first"
            if args.dry_run:
                print(f"  {message}.\nDry run: nothing written.")
                return
            sys.exit(message)
        if await conn.fetchval("SELECT EXISTS (SELECT 1 FROM public.demo_users WHERE user_id = $1::uuid)", new_id):
            sys.exit("That Neon user is the demo account")
        print(f"  Supabase user {old_id} -> Neon user {new_id}")

        s3 = boto3.client(
            "s3",
            endpoint_url=neon_env["AWS_ENDPOINT_URL_S3"],
            region_name=neon_env.get("AWS_REGION", "us-east-1"),
            aws_access_key_id=neon_env["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=neon_env["AWS_SECRET_ACCESS_KEY"],
            config=Config(s3={"addressing_style": "path"}, signature_version="s3v4"),
        )

        if args.dry_run:
            existing = await conn.fetchval("SELECT count(*) FROM public.applications WHERE user_id = $1::uuid", new_id)
            print(f"  Neon already has {existing} applications for this user")
            print("Dry run: nothing written.")
            return

        # Rows first, in one transaction: all or nothing
        async with conn.transaction():
            for application in applications:
                values = {column: application.get(column) for column in APPLICATION_COLUMNS}
                values["date_applied"] = parse(values["date_applied"], "date")
                values["created_at"] = parse(values["created_at"], "datetime")
                values["updated_at"] = parse(values["updated_at"], "datetime")
                values["resume_path"] = new_path(values["resume_path"], old_id, new_id)
                values["cover_letter_path"] = new_path(values["cover_letter_path"], old_id, new_id)
                columns = list(values)
                placeholders = ", ".join(
                    f"${i}::public.application_status" if column == "status" else f"${i}"
                    for i, column in enumerate(columns, start=2)
                )
                updates = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns if column != "id")
                await conn.execute(
                    f"""
                    INSERT INTO public.applications (user_id, {", ".join(columns)})
                    VALUES ($1::uuid, {placeholders})
                    ON CONFLICT (id) DO UPDATE SET {updates}
                    WHERE public.applications.user_id = $1::uuid
                    """,
                    new_id,
                    *(str(v) if column == "id" else v for column, v in values.items()),
                )
                # The updated_at trigger stamps now() on an update; keep Supabase's value
                await conn.execute(
                    "UPDATE public.applications SET updated_at = $2 WHERE id = $1::uuid AND user_id = $3::uuid",
                    application["id"],
                    values["updated_at"],
                    new_id,
                )

            for change in history:
                await conn.execute(
                    """
                    INSERT INTO public.application_status_history
                      (id, application_id, user_id, old_status, new_status, changed_at, is_automatic)
                    VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    change["id"], change["application_id"], new_id, change["old_status"], change["new_status"],
                    parse(change["changed_at"], "datetime"), change["is_automatic"],
                )

            for row in settings:
                await conn.execute(
                    """
                    INSERT INTO public.user_settings (user_id, unlikely_after_days) VALUES ($1::uuid, $2)
                    ON CONFLICT (user_id) DO UPDATE SET unlikely_after_days = EXCLUDED.unlikely_after_days
                    """,
                    new_id,
                    row["unlikely_after_days"],
                )
        print(f"  Rows written: {len(applications)} applications, {len(history)} status changes, {len(settings)} settings")

        copied = skipped = 0
        for path, _kind in files:
            target = new_path(path, old_id, new_id)
            content = supabase.download(path)
            try:
                head = s3.head_object(Bucket=bucket, Key=target)
                if head["ContentLength"] == len(content):
                    skipped += 1
                    continue
            except ClientError:
                pass
            s3.put_object(Bucket=bucket, Key=target, Body=content, ContentType="application/pdf")
            copied += 1
        print(f"  Files: {copied} copied, {skipped} already there")
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
