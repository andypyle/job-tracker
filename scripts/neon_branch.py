#!/usr/bin/env python3
"""
Create and delete short-lived Neon branches for CI, through the Neon API. Standard library only.

    neon_branch.py create --parent production --name ci-123 [--ttl-minutes 60] [--storage-credential]
    neon_branch.py delete <branch_id>

`create` waits for the branch to be ready and prints its settings as KEY=value lines: the
branch id, the pooled and direct DATABASE_URLs, Neon Auth's base URL and the storage endpoint
(plus a storage credential with --storage-credential). With --github-env they're appended to
$GITHUB_ENV instead, and the secrets are masked in the log.

Branches are ordinary copy-on-write children, not schema-only: a schema-only branch is a root
branch, so it inherits neither the parent's Neon Auth nor its storage buckets. Each new branch
gets a fresh neondb_owner password, so its connection string can't open the parent.

Needs NEON_API_KEY and NEON_PROJECT_ID in the environment.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

API = "https://console.neon.tech/api/v2"
DATABASE = "neondb"
ROLE = "neondb_owner"


def call(method: str, path: str, body: dict | None = None, query: dict | None = None) -> dict:
    url = f"{API}{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query)
    request = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Bearer {os.environ['NEON_API_KEY']}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        sys.exit(f"Neon API {method} {path} failed: {exc.code} {exc.read().decode(errors='replace')}")


def project_path() -> str:
    return f"/projects/{os.environ['NEON_PROJECT_ID']}"


def find_branch_id(name_or_id: str) -> str:
    if name_or_id.startswith("br-"):
        return name_or_id
    branches = call("GET", f"{project_path()}/branches", query={"search": name_or_id})["branches"]
    for branch in branches:
        if branch["name"] == name_or_id:
            return branch["id"]
    sys.exit(f"No branch named {name_or_id!r}")


def wait_for_operations(operations: list[dict], timeout: float = 300) -> None:
    deadline = time.monotonic() + timeout
    for operation in operations:
        while True:
            status = call("GET", f"{project_path()}/operations/{operation['id']}")["operation"]["status"]
            if status == "finished":
                break
            if status in ("failed", "error", "cancelled", "skipped"):
                sys.exit(f"Operation {operation['action']} ended as {status}")
            if time.monotonic() > deadline:
                sys.exit(f"Timed out waiting for {operation['action']}")
            time.sleep(2)


def wait_for(fetch, ready, what: str, timeout: float = 120):
    """Poll until a branch service (Auth, Storage) reports ready; they come up after the branch."""
    deadline = time.monotonic() + timeout
    while True:
        try:
            result = fetch()
            if ready(result):
                return result
        except SystemExit:
            if time.monotonic() > deadline:
                raise
        if time.monotonic() > deadline:
            sys.exit(f"Timed out waiting for {what}")
        time.sleep(3)


def connection_uri(branch_id: str, pooled: bool) -> str:
    return call(
        "GET",
        f"{project_path()}/connection_uri",
        query={"branch_id": branch_id, "database_name": DATABASE, "role_name": ROLE, "pooled": str(pooled).lower()},
    )["uri"]


def create(args) -> None:
    parent_id = find_branch_id(args.parent)
    branch: dict = {"parent_id": parent_id, "name": args.name}
    if args.ttl_minutes:
        # Neon deletes the branch itself if the job never gets to
        expires = datetime.now(timezone.utc) + timedelta(minutes=args.ttl_minutes)
        branch["expires_at"] = expires.replace(microsecond=0).isoformat().replace("+00:00", "Z")

    created = call("POST", f"{project_path()}/branches", {"branch": branch, "endpoints": [{"type": "read_write"}]})
    branch_id = created["branch"]["id"]
    # Report the id first, so a later failure can still be cleaned up
    emit(args, {"NEON_BRANCH_ID": branch_id}, secrets=set())
    wait_for_operations(created.get("operations", []))

    # A child of an unprotected branch starts with the parent's role passwords. Give it its own
    # before anything reads a connection string, so CI never holds production's password.
    reset = call("POST", f"{project_path()}/branches/{branch_id}/roles/{ROLE}/reset_password")
    wait_for_operations(reset.get("operations", []))

    auth = wait_for(
        lambda: call("GET", f"{project_path()}/branches/{branch_id}/auth"),
        lambda result: bool(result.get("base_url")),
        "Neon Auth",
    )
    storage = wait_for(
        lambda: call("GET", f"{project_path()}/branches/{branch_id}/storage"),
        lambda result: result.get("enabled") is True,
        "Object Storage",
    )

    values = {
        "DATABASE_URL": connection_uri(branch_id, pooled=True),
        # Migrations go over a direct connection, not the transaction-mode pooler
        "DATABASE_URL_DIRECT": connection_uri(branch_id, pooled=False),
        "NEON_AUTH_BASE_URL": auth["base_url"],
        "AWS_ENDPOINT_URL_S3": storage["s3_endpoint"],
        "AWS_REGION": storage["region"],
    }
    secrets = {"DATABASE_URL", "DATABASE_URL_DIRECT"}

    if args.storage_credential:
        credential = call(
            "POST",
            f"{project_path()}/branches/{branch_id}/credentials",
            {"scopes": ["storage:read", "storage:write"], "principal_type": "user", "name": f"{args.name}-storage"},
        )
        values["AWS_ACCESS_KEY_ID"] = credential["token_id"]
        values["AWS_SECRET_ACCESS_KEY"] = credential["s3_secret_access_key"]
        secrets |= {"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"}

    emit(args, values, secrets)


def emit(args, values: dict[str, str], secrets: set[str]) -> None:
    if args.github_env:
        for key in secrets:
            print(f"::add-mask::{values[key]}")
        with open(os.environ["GITHUB_ENV"], "a") as env:
            for key, value in values.items():
                env.write(f"{key}={value}\n")
        for key in values:
            print(f"{key} set{' (masked)' if key in secrets else '=' + values[key]}")
    else:
        for key, value in values.items():
            print(f"{key}='{value}'")


def delete(args) -> None:
    call("DELETE", f"{project_path()}/branches/{args.branch_id}")
    print(f"Deleted {args.branch_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)

    create_parser = commands.add_parser("create")
    create_parser.add_argument("--parent", required=True, help="Parent branch name or id")
    create_parser.add_argument("--name", required=True)
    create_parser.add_argument("--ttl-minutes", type=int, default=60)
    create_parser.add_argument("--storage-credential", action="store_true", help="Also mint a storage:read/write credential")
    create_parser.add_argument("--github-env", action="store_true", help="Append to $GITHUB_ENV and mask secrets")
    create_parser.set_defaults(run=create)

    delete_parser = commands.add_parser("delete")
    delete_parser.add_argument("branch_id")
    delete_parser.set_defaults(run=delete)

    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
