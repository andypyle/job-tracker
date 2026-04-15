# Job Application Tracker — PRD (RPG Format)

## 1. Overview

### Problem Statement

Job seekers tracking applications in Airtable or spreadsheets deal with unnecessary complexity and generic tooling. There is no focused, minimal tool built specifically for this workflow.

### Target Users

Individual job seekers managing an active job search. Single-user accounts, no collaboration needed.

### Success Metrics

- User can log a new application in under 60 seconds
- Status updates require no more than 2 clicks
- Dashboard gives an accurate picture of job search health at a glance
- App deploys to Railway with a single push

### Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS v4, in `packages/frontend/`
- **Shared types:** TypeScript package in `packages/shared/`, consumed by frontend
- **Backend:** Python FastAPI, in `backend/`
- **Database / Auth / Storage:** Supabase (PostgreSQL + GoTrue + Storage)
- **Package management:** pnpm workspaces (JS), pip (Python)
- **Deployment:** Railway

---

## 2. Functional Decomposition (WHAT)

### Capability A: Authentication

Features:

- **Register** — user creates account with email + password via Supabase Auth
- **Login** — user authenticates, receives JWT, session persisted client-side
- **Logout** — session cleared, redirected to `/login`
- **Route protection** — unauthenticated users redirected to `/login` on any protected route

### Capability B: OpenGraph Enrichment

Features:

- **Fetch OpenGraph tags** — given a job post URL, backend fetches `og:title`, `og:site_name`, `og:image` via plain HTTP
- **Auto-fill form** — returned values pre-populate job title, company, and logo URL fields silently
- **Graceful failure** — any fetch/parse error returns nulls silently; no error shown to user

### Capability C: Application Management (CRUD)

Features:

- **Create application** — form fields: job post URL, job title, company, company logo URL (from OG), industry, compensation, referral checkbox, resume PDF upload, cover letter PDF upload, date applied (date picker). Status always defaults to `Applied` on creation.
- **Read applications** — list view filterable by status, sorted by `date_applied` descending
- **Update application** — all fields editable; status changeable via dropdown
- **Delete application** — with confirmation dialog; also removes associated files from Storage

### Capability D: File Management

Features:

- **Upload resume** — PDF only, max 10MB, stored per application in Supabase Storage
- **Upload cover letter** — same constraints as resume
- **Download files** — signed URLs with 1-hour expiry returned on detail fetch
- **Delete files** — removes from Storage and nulls the path on the application record

### Capability E: Status Lifecycle

Features:

- **Manual status transitions** — user can set any status via dropdown: Applied, Interviewing, Offer, Rejected, Role Eliminated, Unlikely
- **Auto-transition to Unlikely** — background job runs daily at 02:00 UTC; sets `Unlikely` on any application where `status = 'Applied'` and `date_applied <= NOW() - 14 days`

### Capability F: Dashboard & Analytics

Features:

- **Summary cards** — Total Applications, Active (Applied + Interviewing), Offers, Response Rate ((Interviewing + Offers) / Total)
- **Applications over time chart** — bar chart grouped by week or month (Recharts)
- **Status breakdown chart** — donut chart, one slice per status with > 0 applications (Recharts)
- **Empty state** — friendly prompt with CTA when no applications exist

### Capability G: Application List View

Features:

- **Sidebar navigation** — links for All, Applied, Interviewing, Unlikely, Offer, Rejected, Role Eliminated
- **Filtered list** — applications matching the selected status, sorted by date applied descending
- **Application card** — company logo/initials avatar, company, job title, date applied, status badge, compensation, referral chip

### Capability H: Application Detail View

Features:

- **Full detail display** — all fields, signed file download links
- **Edit in place** — opens edit modal pre-filled with current values
- **Delete with confirmation** — removes record and files; navigates back to list

---

## 3. Structural Decomposition (HOW)

### Repository Structure

```
/
├── packages/
│   ├── shared/                          # Capability: shared types/constants
│   │   └── src/
│   │       ├── types.ts                 # ApplicationStatus, Application, ApplicationCreate, ApplicationUpdate
│   │       └── constants.ts            # STATUS_COLORS, STATUS_LABELS, URL_TO_STATUS
│   │
│   └── frontend/                        # Capabilities: A, B, C, D, E, F, G, H (UI layer)
│       └── src/
│           ├── lib/
│           │   ├── supabase.ts          # Supabase auth client (auth state only)
│           │   ├── api.ts               # FastAPI client (all data fetching)
│           │   └── utils.ts             # Date formatting, avatar color hash, etc.
│           ├── hooks/
│           │   └── useAuth.ts           # Auth state hook
│           ├── components/
│           │   ├── Layout.tsx           # Sidebar + main content shell
│           │   ├── StatusBadge.tsx      # Pill badge using STATUS_COLORS
│           │   ├── CompanyAvatar.tsx    # og:image with initials fallback
│           │   ├── StatCard.tsx         # Dashboard summary card
│           │   ├── ApplicationCard.tsx  # List item card
│           │   ├── ApplicationModal.tsx # Add/edit modal wrapper
│           │   └── ApplicationForm.tsx  # Full form with OG auto-fill
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── RegisterPage.tsx
│           │   ├── DashboardPage.tsx
│           │   ├── JobsPage.tsx
│           │   └── ApplicationDetailPage.tsx
│           └── App.tsx                  # Router + protected routes
│
├── backend/                             # Capabilities: A, B, C, D, E (API layer)
│   └── app/
│       ├── main.py                      # FastAPI app, CORS, startup/shutdown
│       ├── config.py                    # Env var settings (pydantic-settings)
│       ├── dependencies.py              # get_current_user JWT dependency
│       ├── routers/
│       │   ├── applications.py          # GET/POST/PATCH/DELETE /applications
│       │   ├── files.py                 # File upload/delete routes
│       │   └── opengraph.py            # POST /opengraph
│       ├── models/
│       │   └── application.py           # Pydantic request/response models
│       └── services/
│           ├── opengraph.py            # fetch_opengraph() — Capability B
│           ├── scheduler.py            # APScheduler auto-Unlikely — Capability E
│           └── storage.py              # Supabase Storage helpers — Capability D
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql       # applications table, RLS, indexes, storage
```

### Module-to-Capability Mapping

| Module                                                  | Capabilities                      |
| ------------------------------------------------------- | --------------------------------- |
| `packages/shared/`                                      | Used by all frontend capabilities |
| `packages/frontend/src/lib/api.ts`                      | B, C, D                           |
| `packages/frontend/src/lib/supabase.ts`                 | A                                 |
| `packages/frontend/src/pages/DashboardPage.tsx`         | F                                 |
| `packages/frontend/src/pages/JobsPage.tsx`              | G                                 |
| `packages/frontend/src/pages/ApplicationDetailPage.tsx` | H                                 |
| `packages/frontend/src/components/ApplicationForm.tsx`  | B, C, D                           |
| `backend/app/routers/applications.py`                   | C                                 |
| `backend/app/routers/files.py`                          | D                                 |
| `backend/app/routers/opengraph.py`                      | B                                 |
| `backend/app/services/scheduler.py`                     | E                                 |
| `backend/app/services/storage.py`                       | D                                 |
| `supabase/migrations/001_initial_schema.sql`            | A, C, D, E                        |

---

## 4. Dependency Graph (CRITICAL)

### Phase 0 — Foundation (no dependencies)

- **supabase-schema**: No dependencies. Creates `applications` table, enum, RLS policies, indexes, storage bucket. Everything else depends on this existing.
- **shared-types**: No dependencies. Defines `ApplicationStatus`, `Application`, `STATUS_COLORS`, `URL_TO_STATUS`. Frontend features cannot be built without this.
- **backend-foundation**: No dependencies. FastAPI app scaffolding, config, CORS, `get_current_user` dependency, health check route.

### Phase 1 — Core Services (depend on Phase 0)

- **backend-opengraph-service**: Depends on `[backend-foundation]`. Implements `fetch_opengraph()` in `services/opengraph.py` and the `POST /opengraph` route.
- **backend-application-routes**: Depends on `[backend-foundation, supabase-schema]`. All CRUD routes for `/applications`.
- **backend-file-routes**: Depends on `[backend-foundation, supabase-schema]`. Upload/delete routes and `services/storage.py`.
- **backend-scheduler**: Depends on `[backend-foundation, supabase-schema]`. APScheduler auto-Unlikely job wired into FastAPI startup.
- **frontend-foundation**: Depends on `[shared-types]`. Vite scaffold, Tailwind v4, routing, auth pages, Layout shell, Supabase auth client, API client stub.

### Phase 2 — Frontend Features (depend on Phase 1)

- **frontend-dashboard**: Depends on `[frontend-foundation, backend-application-routes, shared-types]`. DashboardPage, StatCard, Recharts charts.
- **frontend-jobs-list**: Depends on `[frontend-foundation, backend-application-routes, shared-types]`. JobsPage, ApplicationCard, StatusBadge, CompanyAvatar.
- **frontend-application-form**: Depends on `[frontend-foundation, backend-application-routes, backend-opengraph-service, backend-file-routes, shared-types]`. ApplicationForm, ApplicationModal with OG auto-fill and file upload.
- **frontend-detail-view**: Depends on `[frontend-foundation, frontend-application-form, backend-application-routes, backend-file-routes]`. ApplicationDetailPage with edit and delete.

### Phase 3 — Testing (depend on Phase 1 + Phase 2)

- **backend-tests**: Depends on `[backend-application-routes, backend-opengraph-service, backend-file-routes, backend-scheduler]`. pytest suite covering all routes and services.
- **frontend-tests**: Depends on `[frontend-dashboard, frontend-jobs-list, frontend-application-form, frontend-detail-view]`. Vitest + RTL + MSW suite.

### Phase 4 — Deployment (depends on all phases)

- **deployment**: Depends on everything. `railway.toml`, Dockerfiles, env var documentation, SPA fallback config.

---

## 5. Implementation Roadmap

### Phase 0 — Foundation

**Entry criteria:** Repo initialized, Supabase project created, env vars available  
**Exit criteria:** Schema deployed to Supabase, shared types package published locally, FastAPI returns 200 on `/health`

Tasks:

1. Deploy Supabase schema (`supabase/migrations/001_initial_schema.sql`)
2. Scaffold `packages/shared/` with all types and constants
3. Scaffold FastAPI app with config, CORS, auth dependency, health route

### Phase 1 — Core Services

**Entry criteria:** Phase 0 complete  
**Exit criteria:** All backend routes return correct responses locally; OpenGraph fetch works against a real URL; scheduler transitions a test record correctly

Tasks: 4. Implement `POST /opengraph` and `services/opengraph.py` 5. Implement all `/applications` CRUD routes 6. Implement file upload/delete routes and `services/storage.py` 7. Implement APScheduler auto-Unlikely job 8. Scaffold frontend: Vite + Tailwind v4 + routing + auth pages + Layout + API client

### Phase 2 — Frontend Features

**Entry criteria:** Phase 1 complete  
**Exit criteria:** Full UI flow works end-to-end locally (add application → view list → view detail → change status)

Tasks: 9. Build DashboardPage with stat cards and Recharts charts 10. Build JobsPage with sidebar filters and ApplicationCard 11. Build ApplicationForm with OpenGraph auto-fill and file upload 12. Build ApplicationDetailPage with edit modal and delete

### Phase 3 — Testing

**Entry criteria:** Phase 2 complete  
**Exit criteria:** All tests pass; no uncovered critical paths

Tasks: 13. Write pytest suite for all backend routes and services 14. Write Vitest + RTL + MSW suite for all frontend components and pages

### Phase 4 — Deployment

**Entry criteria:** Phase 3 complete  
**Exit criteria:** Both Railway services deploy and pass health checks; full flow works in production

Tasks: 15. Write `railway.toml`, backend `Dockerfile`, frontend SPA fallback config 16. Write `DEPLOYMENT.md` with step-by-step Railway + Supabase setup guide

---

## 6. Test Strategy

### Backend (pytest)

- **Unit tests:** `services/opengraph.py` — all failure modes return nulls; never raises
- **Unit tests:** `services/scheduler.py` — correct records updated, correct records skipped
- **Route tests:** All `/applications` routes with mocked Supabase and mocked `get_current_user`
- **Route tests:** File routes — PDF validation, size validation, correct Storage paths
- **Security tests:** Verify user A cannot read/modify/delete user B's applications

Critical scenarios:

- OpenGraph returns nulls on timeout, non-200, missing tags, malformed HTML
- Scheduler updates only `Applied` records older than 14 days
- `DELETE /applications/{id}` removes Storage files in addition to the DB record
- File upload rejects non-PDF and files over 10MB

### Frontend (Vitest + React Testing Library + MSW)

- **Component tests:** `CompanyAvatar` — renders image when URL present; falls back to initials on `onError`
- **Component tests:** `StatusBadge` — correct Tailwind classes per status from `STATUS_COLORS`
- **Component tests:** `ApplicationForm` — OG auto-fill on URL blur; no error shown on OG failure; required field validation
- **Page tests:** `DashboardPage` — empty state; correct stat card values
- **Page tests:** `JobsPage` — correct filtering per status param
- **Auth tests:** Unauthenticated users redirected to `/login`

Test pyramid targets: 60% unit, 30% integration, 10% smoke

---

## 7. Architecture & Risks

### Data Model

```sql
CREATE TYPE application_status AS ENUM (
  'Applied', 'Interviewing', 'Unlikely', 'Offer', 'Rejected', 'Role Eliminated'
);

CREATE TABLE applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_post_url      TEXT,
  job_title         TEXT NOT NULL,
  company           TEXT NOT NULL,
  company_logo_url  TEXT,
  industry          TEXT,
  compensation      TEXT,
  is_referral       BOOLEAN NOT NULL DEFAULT FALSE,
  resume_path       TEXT,
  cover_letter_path TEXT,
  date_applied      DATE NOT NULL,
  status            application_status NOT NULL DEFAULT 'Applied',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS enabled. Users can only SELECT/INSERT/UPDATE/DELETE their own rows. Storage bucket `application-files` scoped to `{user_id}/` prefix.

### Status Flow

```
Applied (default)
  ├─ manual ──► Interviewing ──► Offer
  │                           ──► Rejected
  │                           ──► Role Eliminated
  └─ auto (14 days) ──► Unlikely
```

### API Response Envelope

All FastAPI responses follow:

```json
{ "data": <payload>, "error": null }
{ "data": null, "error": "human-readable message" }
```

### Key Technical Decisions

- **Supabase for auth + storage** — eliminates custom auth and S3 setup; RLS enforces data isolation at the DB level
- **FastAPI in front of Supabase** — keeps service role key off the client; centralizes business logic (scheduler, OG fetch, file validation)
- **pnpm workspaces** for JS only — Python backend sits as a sibling, not a workspace member; avoids forcing Node tooling on Python
- **OpenGraph only, no scraping** — plain HTTP fetch + HTML parse for `og:title`, `og:site_name`, `og:image`; no headless browser; silent failure
- **Company logo as URL only** — `og:image` stored as a string; frontend renders it with `onError` fallback to initials avatar; no image proxying or downloading

### Risks & Mitigations

| Risk                                                                    | Mitigation                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| OpenGraph tags missing on many job boards                               | Silent failure + manual entry always available                                    |
| APScheduler runs multiple times if Railway scales to multiple instances | Acceptable for v1; document that a Railway cron job is the correct fix if scaling |
| Supabase Storage signed URL expiry causes stale links                   | 1-hour expiry re-fetched on each detail view load                                 |
| Large PDF uploads timing out through FastAPI                            | Stream uploads directly to Supabase Storage; don't buffer in FastAPI memory       |

### Out of Scope (v1)

- Email notifications
- Chrome extension or job board integrations
- Resume library shared across applications
- Team or shared accounts
- Mobile app
- CSV export
- Dark mode
