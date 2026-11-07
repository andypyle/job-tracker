# Job Tracker

A web app for tracking job applications: where you applied, where each one stands, and how your search is going overall.

![Dashboard in light mode](docs/screenshots/dashboard-light.png)

## Why I built it

- **Spreadsheets got tedious.** I wanted to spend my time on the job search itself, not on maintaining columns, formulas and conditional formatting.
- **I wanted to explore Python on the backend**, so the API is FastAPI.
- **Room to grow.** I'd previously built an AI-driven interview prep app, and this gives it a natural home if I decide to fold it in.

## Features

- **Track applications through their lifecycle:** Applied → Interviewing → Offer, Rejected or Role Eliminated, with a timeline of every status change.
- **Automatic follow-up:** applications with no movement are moved to Unlikely by a nightly job, so the active list stays honest. The wait is 14 days by default; pick 7 to 60 days, or turn it off, in Settings.
- **Accounts:** sign up with an email and password, reset a forgotten password by email, change your name and password in Settings, or delete your account and everything in it.
- **Paste a link to fill in the details:** the backend scrapes the job post's OpenGraph and JSON-LD data for the title, company, logo and compensation.
- **Attach your résumé and cover letter** (PDF). Downloads are short-lived presigned URLs.
- **Dashboard:** response rate, interview rate, average response time, applications per week and by status.
- **Light and dark mode**, following your system setting, and a phone layout with its own navigation.

| Application detail | Phone, light and dark |
| --- | --- |
| ![Application detail](docs/screenshots/detail-light.png) | ![Active applications on a phone](docs/screenshots/active-phone.png) ![Active applications on a phone, dark mode](docs/screenshots/active-phone-dark.png) |

![Dashboard in dark mode](docs/screenshots/dashboard-dark.png)

## How it's built

| | |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Hook Form + Zod |
| **Backend** | Python, FastAPI, APScheduler, Beautiful Soup |
| **Data and auth** | Neon: Postgres, Neon Auth (Managed Better Auth), Object Storage; dbmate migrations |
| **Testing** | Vitest, Storybook 10, Playwright, axe, pytest, MSW |
| **Hosting** | Railway (Docker), GitHub Actions |

Some decisions worth calling out:

- **Neon Auth handles sign-in only.** The browser never queries the database. Every request goes through the FastAPI backend, which verifies the user's Neon Auth token against the branch's public keys and talks to Postgres and Object Storage, scoping every query to that user.
- **Branches for everything.** Neon branches the database, the auth users and the file storage together, so local development, CI smoke tests and end-to-end tests each run on their own copy, and throwaway ones are deleted when the run ends.
- **A design system built in Figma first.** Colors, type, spacing and motion are tokens that map one-to-one to Figma variables. Dark mode uses CSS `light-dark()` on those tokens rather than a second set of styles, so every component gets it for free.
- **Accessibility is enforced, not hoped for.** Every Storybook story runs as a test in a real browser, including axe accessibility checks; a violation fails the build.
- **Testing in layers.**
  - Backend tests running real SQL against a disposable Postgres.
  - Frontend unit tests against a mocked API.
  - Story tests for every component and screen, with interaction tests in their `play` functions.
  - Live smoke tests on a throwaway copy of production: real sign-in tokens, storage and migrations.
  - End-to-end tests that run the real stack on a throwaway Neon branch: the API and a production build.

  Pull requests run the backend, unit and story tests; the Neon-backed suites run on `main` and on demand.

## Running it locally

Requires Node 24, pnpm, Python 3.12 and a Neon project with Auth and Object Storage enabled (`neon.ts` declares them).

```bash
pnpm install
```

Copy `backend/.env.example` to `backend/.env` and `packages/frontend/.env.example` to `packages/frontend/.env`, and fill them in for a development branch: its connection string, Neon Auth URL and a storage credential (the Neon Console's Connect dialog has all three). Then apply the migrations:

```bash
pnpm db:migrate                   # db/migrations, with dbmate, to the branch in backend/.env
```

```bash
# API on :8000
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # the app's dependencies plus pytest
uvicorn app.main:app --reload --port 8000

# Frontend on :5173 (from the repo root, in another terminal)
pnpm --filter frontend dev
```

Create an account on the Sign up page. For the demo account, sign up as `demo@example.com` / `demo-password`, add that user to `demo_users` and run `SELECT reset_demo_data();` (see `db/migrations`).

### Tests

```bash
cd backend && pytest                      # backend; needs TEST_DATABASE_URL, a disposable local Postgres

cd packages/frontend
pnpm test:unit                            # unit tests
pnpm test:storybook                       # every story, with accessibility checks
pnpm test:e2e                             # end to end; needs a throwaway Neon branch (see e2e/env.ts) and the backend venv
pnpm storybook                            # browse the components on :6006
```

## Project structure

```
backend/              FastAPI app: routes, nightly job, scraping, tests
packages/frontend/    React app, Storybook stories and E2E tests
packages/shared/      TypeScript types shared across the frontend
db/migrations/        SQL migrations (dbmate), including the demo account's sample data
scripts/              Throwaway Neon branches for CI and E2E
```

## What's next

- Error monitoring and observability with Sentry.
- Possibly bringing in the AI interview prep from my earlier project.
