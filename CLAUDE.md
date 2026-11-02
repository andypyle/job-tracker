# CLAUDE.md

**Git:** never attribute work to Claude in commit messages or PR descriptions — no `Co-Authored-By: Claude`, no "Generated with Claude Code" lines.

Job application tracker. pnpm monorepo: React frontend in `packages/frontend`, shared TS types in `packages/shared` (`@jobtracker/shared`), Python FastAPI backend in `backend/` (not a pnpm workspace member).

## Running locally

```bash
pnpm install && pnpm --filter frontend dev     # frontend on :5173
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

Env templates are `packages/frontend/.env.example` and `backend/.env.example`. Never commit `.env` files.

## Architecture rules

- **Data flow:** the frontend uses Supabase **only for auth** (`src/lib/supabase.ts`). All data goes through the FastAPI backend via the functions in `src/lib/api.ts`, which attaches the Supabase JWT. Never call `fetch`/axios or query Supabase tables directly from components.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the frontend. Only `VITE_`-prefixed vars reach the browser.
- **Backend responses** use the envelope `{ data, error }`. `api.ts` unwraps it, so components only see data or a thrown error.
- **Shared types:** `Application`, `ApplicationStatus`, `ApplicationCreate`, `ApplicationUpdate`, etc. come from `@jobtracker/shared`; never redefine them in the frontend. The backend keeps its own Pydantic equivalents and doesn't import from `shared`, so a type change there needs a matching backend change.
- **Server state** via TanStack Query; **forms** via React Hook Form + zod.
- **TypeScript:** no `any` without a comment explaining why.
- **Dark mode:** follow `prefers-color-scheme` with CSS custom properties. There is no theme toggle.

## Styling and tokens

- Tokens live in `packages/frontend/src/styles/tokens.css` and map 1:1 to the Figma variables: `color/bg/canvas` is `--color-bg-canvas`, so the utility is `bg-bg-canvas` (likewise `text-text-muted`, `border-border-subtle`, `bg-tone-info-soft`). Use semantic tokens only; primitives (`--pine-900`, etc.) are deliberately not utilities.
- Semantic colors use `light-dark()`, so dark mode follows `color-scheme`. Never add `dark:` variants or a second set of dark values.
- Each Figma text style is one utility: `text-heading-h1`, `text-body-small`, `text-label-small`, `text-caption-medium`, and so on. Headings and display styles also need `font-display`.
- One shadow (`shadow-overlay`), 4px radius by default (`rounded-sm`), no pills. Motion: `ease-bounce` for enters, `ease-in` for exits, durations `duration-(--duration-fast|base|slow)`; reduced motion keeps opacity changes only.
- New custom theme keys must also be registered in `src/lib/cn.ts`, or tailwind-merge may drop them.
- Icons: `<Icon name="briefcase" />`, colored by `currentColor`. Add icons to `Icon.paths.ts` from the Figma Icons page.
- Stories that matter in both modes should include a dark variant with `globals: { theme: 'dark' }`.

## Domain

Statuses and how they change:

```
Applied (default) → Interviewing → Offer | Rejected | Role Eliminated   (manual)
Applied → Unlikely                                                      (automatic after 14 days in Applied, nightly job)
```

Users can attach PDF résumé and cover-letter uploads (max 10MB, PDF only). Download links are signed URLs that expire after 1 hour, so don't cache them long-term in the UI.

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

### Scaffolding

Always scaffold with plop; don't create these files by hand. The interactive prompts don't work in a non-TTY shell, so pass the answers as positional arguments from the repo root:

```bash
# component: <name> <withVariants>
pnpm --filter frontend generate:component ApplicationCard true

# part: <parentComponent> <name> <withVariants> <withStories>
pnpm --filter frontend generate:part ApplicationCard card-header false false
```

Names can be given in any case; they're converted to PascalCase. The part generator only accepts a parent folder that contains a matching `Name/Name.tsx`. The plopfile is `packages/frontend/plopfile.js`, and the templates are in `packages/frontend/plop-templates/component/`. If you change the conventions above, update the templates too.

## Storybook and tests

Run these from `packages/frontend`:

| Command | What it does |
| --- | --- |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm test:storybook` | Runs every story as a test in headless Chromium: render, `play` function, axe a11y checks |
| `pnpm test:unit` | Vitest + jsdom unit tests (MSW server in `src/test/`) |
| `pnpm test` | Both projects |

Accessibility violations fail story tests (`a11y.test: 'error'` in `.storybook/preview.tsx`). Fix the violation; only opt a story out with `parameters: { a11y: { test: 'todo' } }` when there's a documented reason. Import story types from `@storybook/react-vite` and test utilities from `storybook/test`.

A new component isn't done until its stories pass `pnpm test:storybook` and `pnpm exec tsc --noEmit` is clean.
