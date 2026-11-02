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
- Compose with children and parts (`Card`/`CardHeader`/`CardTitle`) only where the content varies from use to use. Where the design fixes the structure, use props, with `ReactNode` props for slots. A Figma Slot instance maps to `children`.
- Toasts: call `toast({ tone, title, … })` from `src/lib/toast.ts`. The one `<Toaster />` is in `AppShell`.

## Pages

Each page in `src/pages` exports two things: a presentational `XScreen` that takes data and callbacks as props, and `XPage`, which wires it to queries, mutations and the router. Stories render the Screen under `Screens/…` (inside `AppShell` for app pages). `AppLayout` is the protected route element; pages open the Add dialog with `useAddApplication()`.

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
