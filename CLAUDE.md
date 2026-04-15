# CLAUDE.md — Job Application Tracker

This file is the primary reference for Claude Code working in this codebase. Read it before making any changes. Subagents should also read their own `agents/AGENT_*.md` file.

---

## What This Project Is

A full-stack web app for tracking job applications. Users log in, add applications with file uploads, track status changes, and view dashboard analytics. See `PRODUCT.md` for the full product spec.

---

## Monorepo Structure

```
/
├── packages/
│   ├── frontend/               # React 18 + Vite + TailwindCSS v4
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Route-level page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # API client, Supabase client, utilities
│   │   │   └── types/          # Local types (re-exports from shared)
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── shared/                 # Shared TypeScript types and constants
│       └── src/
│           ├── types.ts         # ApplicationStatus, Application, etc.
│           └── constants.ts     # STATUS_COLORS, STATUS_LABELS, etc.
│
├── backend/                    # Python FastAPI — not a pnpm workspace member
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py     # JWT auth dependency
│   │   ├── routers/            # Route handlers
│   │   ├── models/             # Pydantic models
│   │   └── services/           # opengraph.py, scheduler.py, storage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── supabase/
│   └── migrations/
│
├── .taskmaster/                # TaskMaster AI — do not edit manually
│   └── docs/
│       └── prd.txt             # Plain-text PRD for TaskMaster to parse
│
├── agents/
│   ├── AGENT_PM.md
│   ├── AGENT_BACKEND.md
│   ├── AGENT_FRONTEND.md
│   └── AGENT_TESTING.md
│
├── package.json                # pnpm workspace root
├── pnpm-workspace.yaml
├── CLAUDE.md
├── PRODUCT.md
└── railway.toml
```

### pnpm workspace

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`backend/` is a sibling directory, not a workspace member. It is self-contained with its own `requirements.txt` and `Dockerfile`.

---

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=http://localhost:5173
```

### Frontend (`packages/frontend/.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

Never commit `.env` files. Use `.env.example` as the template.

---

## Running Locally

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend + Shared
```bash
pnpm install          # from repo root
pnpm --filter frontend dev
```

---

## TaskMaster Setup

TaskMaster runs as an MCP server in Claude Code. No separate API key is required when using Claude Code's built-in OAuth.

Add to `.claude/mcp.json` (project-scoped):
```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "MODEL": "claude-code"
      }
    }
  }
}
```

Configure `.taskmaster/config.json`:
```json
{
  "models": {
    "main": { "provider": "claude-code", "modelId": "sonnet", "maxTokens": 64000 },
    "research": { "provider": "claude-code", "modelId": "opus", "maxTokens": 32000 },
    "fallback": { "provider": "claude-code", "modelId": "sonnet", "maxTokens": 64000 }
  }
}
```

The PM agent owns TaskMaster initialization and task management. Other agents pull tasks from it and report back.

---

## Key Conventions

### Frontend

- **TypeScript throughout** — no `any` without a comment explaining why
- **Shared types** come from `@jobtracker/shared` — never redefine `ApplicationStatus` or `Application` in the frontend
- **API calls** go through `packages/frontend/src/lib/api.ts` — never call `fetch` directly in components
- **Auth state** via Supabase client in `lib/supabase.ts`; all data fetching via FastAPI backend
- **Forms** use React Hook Form
- **Server state** via TanStack Query (React Query)
- **Status badge colors** imported from `@jobtracker/shared` — never hardcode

### Backend

- All responses: `{ "data": ..., "error": null }` or `{ "data": null, "error": "message" }`
- Every protected endpoint verifies the Supabase JWT from `Authorization: Bearer <token>`
- `user_id` always comes from the verified JWT — never trust it from the request body
- Use `httpx` (async) for OpenGraph fetching with a 5-second timeout; catch all exceptions silently
- Scheduler runs via APScheduler at startup, once daily at 02:00 UTC

### Shared Package

- Package name: `@jobtracker/shared`
- Exports: `ApplicationStatus`, `Application`, `ApplicationCreate`, `ApplicationUpdate`, `STATUS_COLORS`, `STATUS_LABELS`, `URL_TO_STATUS`
- The Python backend does NOT import from `shared/` — it maintains its own equivalent Pydantic models and Python enums

### Database

- Migrations in `supabase/migrations/` as numbered SQL files
- RLS **enabled** on `applications` — users can only read/write their own rows
- Storage bucket `application-files` has RLS: users can only access files under their own `user_id` prefix
- Only the backend service role key may bypass RLS (for the scheduler)

---

## OpenGraph Fetching

`backend/app/services/opengraph.py` — `async def fetch_opengraph(url: str) -> dict`

- `httpx.AsyncClient` with 5-second timeout and a realistic User-Agent
- Parses HTML for: `og:title`, `og:site_name`, `og:image`
- Falls back: `og:title` → `<title>` tag (strip site suffix); `og:site_name` → domain name
- Returns `{ "title": None, "company": None, "logo_url": None }` on any failure
- Never raises to the caller — all exceptions caught internally
- `logo_url` is returned as-is (not validated, not downloaded); the frontend handles broken images with a fallback initials avatar

---

## Application Status Flow

```
Applied (default)
  ↓ manual
Interviewing
  ↓ manual          ↓ manual         ↓ auto (14 days in Applied)
Offer            Rejected          Unlikely
                 Role Eliminated
```

Auto-transition handled in `backend/app/services/scheduler.py`. All others via `PATCH /applications/{id}`.

---

## File Uploads

- Bucket: `application-files`
- Path: `{user_id}/{application_id}/resume.pdf` or `.../cover_letter.pdf`
- Max 10MB, PDF only
- Signed download URLs generated on `GET /applications/{id}`, 1-hour expiry
- Uploads handled by the backend using the service role key

---

## Agent System

Four subagents are defined in `agents/`. Each owns a domain and works autonomously. The PM agent owns the TaskMaster task list and coordinates via task status — it does not micromanage other agents.

See `agents/AGENT_PM.md` for the coordination protocol.

---

## What NOT to Do

- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or browser
- Don't call the Supabase database directly from the frontend (auth only via Supabase client; all data via FastAPI)
- Don't skip RLS — every frontend-path query must be user-scoped
- Don't use a headless browser or Playwright for OpenGraph fetching
- Don't redefine types that live in `@jobtracker/shared`
- Don't add dark mode, CSV export, or team features — explicitly out of scope for v1
- Don't edit files under `.taskmaster/` manually — let TaskMaster manage them
