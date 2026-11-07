# CLAUDE.md

Job application tracker. pnpm monorepo: React frontend in `packages/frontend`, shared TS types in `packages/shared` (`@jobtracker/shared`), Python FastAPI backend in `backend/` (not a pnpm workspace member). Data, auth and files are on Neon (project `job-tracker`): Postgres, Neon Auth (Managed Better Auth) and Object Storage. `neon.ts` declares the services.

## Running locally

```bash
pnpm install && pnpm --filter frontend dev     # frontend on :5173
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

Env templates are `packages/frontend/.env.example` and `backend/.env.example`. Never commit `.env` files. Both point at the same Neon branch: users live in that branch's database, so the frontend's `VITE_NEON_AUTH_URL` and the backend's `DATABASE_URL` must match.

Neon branches:

- `production`: real data. Never point local dev, tests or E2E at it, or at a copy of it with real users.
- `dev`: synthetic data with a demo login (`demo@example.com` / `demo-password`). Local development uses it, and E2E branches from it.
- Throwaway branches: `scripts/neon_branch.py create --parent <dev|production> --name … --storage-credential` prints a branch's settings (each gets its own password) and `delete <id>` removes it; they also expire on their own. It needs `NEON_API_KEY` and `NEON_PROJECT_ID`, kept locally in the gitignored root `.env.local`.

Migrations are plain SQL in `db/migrations`, run with dbmate: `pnpm db:new <name>` creates one (fill in `-- migrate:up` and `-- migrate:down`), `pnpm db:migrate` applies pending ones to the branch in `backend/.env`. Merging to `main` applies them to production (`.github/workflows/migrate.yml`, after a rehearsal on a copy). Never commit real data.

`scripts/import_from_supabase.py` copied each user's data from the old Supabase project at cutover (2026-11-07). Remove it once that project is deleted.

## Architecture rules

- **Data flow:** the frontend uses Neon Auth **only for auth** (`src/lib/auth.ts`, Better Auth's methods through `@neon/auth`; `useAuth` wraps them). All data goes through the FastAPI backend via the functions in `src/lib/api.ts`, which attaches the Neon Auth JWT. Never call `fetch`/axios from components, and never enable Neon's Data API.
- **The backend owns authorization.** It verifies the JWT against the branch's JWKS (`app/dependencies.py`) and connects as the database owner with no RLS behind it, so every query must filter by the token's user id. Use `app/db.py`'s pool with parameterized SQL.
- **Never expose `DATABASE_URL` or the `AWS_*` storage credentials** to the frontend. Only `VITE_`-prefixed vars reach the browser.
- **Backend responses** use the envelope `{ data, error }`. `api.ts` unwraps it, so components only see data or a thrown error.
- **Shared types:** `Application`, `ApplicationStatus`, `ApplicationCreate`, `ApplicationUpdate`, etc. come from `@jobtracker/shared`; never redefine them in the frontend. The backend keeps its own Pydantic equivalents and doesn't import from `shared`, so a type change there needs a matching backend change.
- **Server state** via TanStack Query; **forms** via React Hook Form + zod.
- **TypeScript:** no `any` without a comment explaining why.
- **Dark mode:** follow `prefers-color-scheme` with CSS custom properties. There is no theme toggle.

## Styling and tokens

- Tokens live in `packages/frontend/src/styles/tokens.css` and map 1:1 to the Figma variables: `color/bg/canvas` is `--color-bg-canvas`, so the utility is `bg-bg-canvas` (likewise `text-text-muted`, `border-border-subtle`, `bg-tone-info-soft`). Use semantic tokens only; primitives (`--pine-900`, etc.) are deliberately not utilities. Tailwind's default palette is reset (`--color-*: initial`), so `bg-white`, `text-slate-500` and the like generate nothing.
- Shared class strings (`focusRing`, `colorTransition`, `fieldFrame`, `popoverSurface`, `popoverMotion`) are in `src/lib/classes.ts`. JS-driven motion reads the tokens through `src/lib/motion.ts` (`readDuration`, `readEasing`, `prefersReducedMotion`).
- Status colors: spread `STATUS_TONES[status]` (`{ tone, appearance }`, from `@jobtracker/shared`) into `Badge` or `Select`.
- Semantic colors use `light-dark()`, so dark mode follows `color-scheme`. Never add `dark:` variants or a second set of dark values.
- Each Figma text style is one utility: `text-heading-h1`, `text-body-small`, `text-label-small`, `text-caption-medium`, and so on. Headings and display styles also need `font-display`.
- One shadow (`shadow-overlay`), 4px radius by default (`rounded-sm`), no pills. Motion: `ease-bounce` for enters, `ease-in` for exits, durations `duration-(--duration-fast|base|slow)`; reduced motion keeps opacity changes only.
- New custom theme keys must also be registered in `src/lib/cn.ts`, or tailwind-merge may drop them.
- Icons: `<Icon name="briefcase" />` is static, colored by `currentColor`; add icons to `Icon.paths.ts` from the Figma Icons page. Icons on interactive elements animate: `Button` and `IconButton` do it automatically through `AnimatedIcon` (react-useanimations, one dynamic import per icon). To animate a new icon, add it to `AnimatedIcon.animations.ts` and check its resting frame against the static glyph in the `MatchesStaticIcons` story. Don't animate icons on non-interactive elements.
- Every story file starts with a `Default` story that shows the component with its default props (the plop template scaffolds one). Name the other stories after what they show.
- Stories that matter in both modes should include a dark variant with `globals: { theme: 'dark' }`.
- For layouts that change at a breakpoint, add a story with `globals: { viewport: { value: 'phone' } }` (390×844; `desktop` is 1440×900). It resizes the test browser too, so play functions can check the phone layout.

## Domain

Statuses and how they change:

```
Applied (default) → Interviewing → Offer | Rejected | Role Eliminated   (manual)
Applied → Unlikely                                                      (automatic, nightly job)
```

The nightly move happens after a per-user cutoff: `user_settings.unlikely_after_days` (7, 14, 21, 30 or 60, or null for never; 14 when the user has no row). Users pick it on the Settings page. Copy that mentions the cutoff should read the setting, not say "2 weeks".

Settings also changes the name and password through Neon Auth (`useAuth`; a password change needs the current one). Email addresses can't be changed: Neon Auth doesn't allow it. Deleting the account goes through `DELETE /account`, which deletes the `neon_auth.user` row (Neon Auth has no self-delete; sessions, applications, history and settings cascade) and then their files.

The public demo is any user with a row in `demo_users` (`is_demo_user` in `backend/app/dependencies.py`). The JWT doesn't carry it, so the frontend asks `GET /account` (`useAccount`), and waits for the answer before showing uploads or Settings' account sections. Login shows "Try the demo" when `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` are set. For the demo, Settings shows a note instead of the account sections, uploads are off (`ApplicationForm`'s `allowUploads`), and the backend refuses `DELETE /account` and uploads (`reject_demo_user`). Triggers on `neon_auth.user` and `neon_auth.account` undo changes to its name, email, image and password, and the backend resets its data at 01:30 UTC with `reset_demo_data()`. All of this is in `db/migrations/20261107120000_baseline.sql`. Changing the sample data means editing that function in a new migration. The `neon_auth` schema belongs to Neon: reference it and trigger on it, never alter it.

Users can attach PDF résumé and cover-letter uploads (max 10MB, PDF only), stored in the `application-files` bucket of the branch's Object Storage (`app/services/storage.py`, boto3). Download links are presigned URLs that expire after 1 hour, so don't cache them long-term in the UI.

Company logos come from OpenGraph scraping and may be missing or broken. The UI must always fall back to an initials avatar.

**Out of scope for v1:** CSV export, team/shared features.

## Frontend components

Components live in `packages/frontend/src/components`, one folder per component:

```
ComponentName/
├── ComponentName.tsx           # the component
├── ComponentName.types.ts      # props interface (ComponentNameProps)
├── ComponentName.stories.tsx   # Storybook stories, with play functions for interactions
├── ComponentName.variants.ts   # optional: cva() variants (class-variance-authority)
└── parts/                      # optional: pieces used only by this component
    └── PartName/               # same file layout as a component; stories optional
```

- Put a piece in `parts/` only if no other component needs it. If something else needs it, make it a separate component.
- Merge class names with `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge), and put the caller's `className` last so it wins.
- Variant props come from `VariantProps<typeof componentNameVariants>` in the `.types.ts` file.
- Compose with children and parts (`Card`/`CardHeader`/`CardTitle`) only where the content varies from use to use. Where the design fixes the structure, use props, with `ReactNode` props for slots. A Figma Slot instance maps to `children`.
- Toasts: call `toast({ tone, title, … })` from `src/lib/toast.ts`. The one `<Toaster />` is in `AppShell`.

## Pages

Each page in `src/pages` exports two things: a presentational `XScreen` that takes data and callbacks as props, and `XPage`, which wires it to queries, mutations and the router. Stories render the Screen under `Screens/…` (inside `AppShell` for app pages). `AppLayout` is the protected route element; pages open the Add dialog with `useAddApplication()`.

### Scaffolding

Always scaffold with plop; don't create these files by hand. The interactive prompts don't work in a non-TTY shell, so pass the answers as positional arguments from the repo root:

```bash
# component: <name> <withVariants> <storybookFolder>
pnpm --filter frontend generate:component ApplicationCard true Patterns

# part: <parentComponent> <name> <withVariants> <withStories>
pnpm --filter frontend generate:part ApplicationCard card-header false false
```

Names can be given in any case; they're converted to PascalCase. The part generator only accepts a parent folder that contains a matching `Name/Name.tsx`.

Storybook folders: generic building blocks go under `Components/` by kind (`Actions`, `Forms`, `Data display`, `Feedback`, `Overlays`, `Navigation`, `Icons`; quote `"Components/Data display"` on the command line). App-specific pieces go in `Patterns`, page frames in `Layouts`, and page Screens in `Screens`, matching the Figma file's split. A part's stories sit under its parent's (`…/Select/Parts/Option`). The folder list is `STORY_GROUPS` in the plopfile; keep it in step with `storySort` in `.storybook/preview.tsx`. The plopfile is `packages/frontend/plopfile.js`, and the templates are in `packages/frontend/plop-templates/component/`. If you change the conventions above, update the templates too.

## Storybook and tests

Run these from `packages/frontend`:

| Command | What it does |
| --- | --- |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm test:storybook` | Runs every story as a test in headless Chromium: render, `play` function, axe a11y checks |
| `pnpm test:unit` | Vitest + jsdom unit tests (MSW server in `src/test/`) |
| `pnpm test` | Both projects |
| `pnpm test:e2e` | Playwright against the real stack (`e2e/*.e2e.ts`) on a throwaway branch of `dev`: export the settings `neon_branch.py create --parent dev --storage-credential` prints (see `e2e/env.ts`), activate the backend's venv, and delete the branch afterwards. Playwright starts the backend on :8001 and a production build on :4173; a global setup refuses a database with real users |

Backend tests, from `backend/`:

| Command | What it does |
| --- | --- |
| `pytest` | Routes and jobs against real SQL on a disposable local Postgres (`TEST_DATABASE_URL`, see `tests/conftest.py`), with a stand-in for Neon Auth's tables. No secrets |
| `pytest smoke` | Live checks on a throwaway Neon branch: real Neon Auth tokens, the demo guard, storage, the delete cascade. Never against production |

CI runs `backend` and `frontend` on every PR. The `neon` job (migrations on a copy of production, then `pytest smoke`) and `e2e` need `NEON_API_KEY`, so they run only on pushes to `main` and from Actions > CI > Run workflow; run them by hand on a branch that touches migrations or auth. Neon Auth answers bursts of about ten sign-ins or sign-ups with 429 for a while, so E2E users start signed in with their sign-up session (`signIn` in `e2e/fixtures.ts`) and only tests about the form use `signInWithForm`.

Accessibility violations fail story tests (`a11y.test: 'error'` in `.storybook/preview.tsx`). Fix the violation; only opt a story out with `parameters: { a11y: { test: 'todo' } }` when there's a documented reason. Import story types from `@storybook/react-vite` and test utilities from `storybook/test`.

A new component isn't done until its stories pass `pnpm test:storybook` and `pnpm exec tsc --noEmit` is clean.
