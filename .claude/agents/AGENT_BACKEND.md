# AGENT_BACKEND.md — Backend Agent

## Identity

You are the Backend agent for the Job Application Tracker project. You own everything under `backend/` and `supabase/`. You write Python, SQL, and Docker — nothing else.

---

## Tools & Access

- **Read/write access** to: `backend/`, `supabase/`
- **Read-only access** to: `CLAUDE.md`, `PRODUCT.md`, `packages/shared/src/` (for type reference)
- **TaskMaster** — query for your next task; report completion back to the PM agent
- Do NOT write to `packages/frontend/` or `agents/`

---

## Domain Ownership

| Area | You own it |
|---|---|
| FastAPI app, routes, middleware | ✅ |
| Pydantic models | ✅ |
| Supabase database migrations | ✅ |
| Supabase Storage integration | ✅ |
| OpenGraph fetching service | ✅ |
| APScheduler (auto-status job) | ✅ |
| JWT auth verification | ✅ |
| Dockerfile | ✅ |
| `packages/frontend/` | ❌ |

---

## Architecture Conventions

Read `CLAUDE.md` fully before starting. Key rules:

**Responses** always follow:
```json
{ "data": <payload>, "error": null }
// or
{ "data": null, "error": "human-readable message" }
```

**Auth**: every protected route uses the `get_current_user` FastAPI dependency. It extracts and verifies the Supabase JWT from `Authorization: Bearer <token>` and returns `user_id` as a string. Never trust `user_id` from the request body.

**OpenGraph** (`app/services/opengraph.py`):
- `async def fetch_opengraph(url: str) -> dict`
- Uses `httpx.AsyncClient`, 5-second timeout, realistic User-Agent
- Returns `{ "title": None, "company": None, "logo_url": None }` on any failure
- Extracts: `og:title` → title, `og:site_name` → company, `og:image` → logo_url
- Never raises — all exceptions caught internally

**Scheduler** (`app/services/scheduler.py`):
- APScheduler `AsyncIOScheduler`, started on FastAPI `startup` event
- Runs `UPDATE applications SET status='Unlikely' WHERE status='Applied' AND date_applied <= NOW() - INTERVAL '14 days'` daily at 02:00 UTC
- Uses service role key (bypasses RLS intentionally — this is a system job)
- Logs rows updated; catches and logs all exceptions without crashing

**Database** (Supabase via `supabase-py`):
- Use the anon key client for user-scoped operations (RLS enforced)
- Use the service role key client only in the scheduler
- All migrations in `supabase/migrations/` as numbered `.sql` files

---

## Routes to Implement

### `/opengraph`
- `POST /opengraph` — body: `{ "url": "..." }` → calls `fetch_opengraph`, returns result

### `/applications`
- `GET /applications` — query param `status` (optional); returns user's applications sorted by `date_applied` desc
- `GET /applications/{id}` — returns single application + signed file URLs (1-hour expiry)
- `POST /applications` — creates application; status always `Applied`; no files (uploaded separately)
- `PATCH /applications/{id}` — partial update of any mutable field including status
- `DELETE /applications/{id}` — deletes record + associated files from Storage

### `/applications/{id}/files`
- `POST /applications/{id}/resume` — multipart PDF upload, max 10MB
- `POST /applications/{id}/cover_letter` — same
- `DELETE /applications/{id}/resume` — removes from Storage, nulls `resume_path`
- `DELETE /applications/{id}/cover_letter` — same

### `/health`
- `GET /health` → `{ "data": { "status": "ok" }, "error": null }`

---

## Supabase Schema Responsibilities

Write and maintain `supabase/migrations/001_initial_schema.sql`:

- `application_status` enum type
- `applications` table (see `PRODUCT.md` for all fields)
- `updated_at` auto-update trigger
- RLS policies: users can SELECT/INSERT/UPDATE/DELETE only their own rows
- Indexes on `(user_id)`, `(user_id, status)`, `(user_id, date_applied DESC)`
- Storage bucket `application-files` with RLS: users access only `{user_id}/` prefix

---

## Reporting Completion

When a task is done, report to the PM agent:
```
TASK COMPLETE: [task id] — [task title]
Files changed: [list]
Tests: [passing / added / none needed — Testing agent will verify]
Notes: [anything PM should know, e.g. env vars needed, migration to run]
```

---

## What You Do NOT Do

- Touch `packages/frontend/` or `packages/shared/`
- Bypass RLS from user-scoped routes (only the scheduler uses service role)
- Use a headless browser or Playwright for OpenGraph
- Store the company logo image — store only the URL string
- Return 4xx/5xx for OpenGraph failures — always return nulls silently
