# Design overhaul plan

Implements the JobTracker design system from Figma:
https://www.figma.com/design/ajjKIbesu4oY79EfQIX7Ov/JobTracker

Branch: `design-overhaul`. Design decisions and rules live in the Figma file and in the design notes. This file tracks the build.

## Picking this up in a new session

Read this file and CLAUDE.md first. **Next up: Phase 1 inputs** (Input, PasswordInput, Textarea, Checkbox, FormField), then the rest of Phase 1 in order.

### Workflow per component

1. Load the `figma:figma-design-to-code` skill, call `create_session` for file key `ajjKIbesu4oY79EfQIX7Ov`, then `get_metadata` on the component's page (IDs below) to find the component set, and `get_design_context` on it. Its "Component descriptions" are the spec: sizes, states, motion, a11y.
2. Scaffold with plop (CLAUDE.md), then adapt the reference code to our tokens and components. Reuse `Icon`/`AnimatedIcon`, `focusRing` and `colorTransition` from `src/lib/classes.ts`, and `cn()`.
3. Stories with play functions, plus a dark story (`globals: { theme: 'dark' }`).
4. `pnpm exec tsc --noEmit` and `pnpm test` from `packages/frontend`.
5. Compare visually: `pnpm build-storybook -o <tmp>/sb --quiet`, then `node scripts/screenshot-stories.mjs <tmp>/sb <tmp> <story-id>...`, against `get_screenshot` of the Figma component set (the component pages also have a "Light and dark" frame).
6. Tick the box here. Commit at the end of each batch when the user says so.

### Figma page IDs

| Page | ID | Page | ID |
| --- | --- | --- | --- |
| Foundations | 4:2 | Icons | 14:143 |
| Input | 14:145 | Textarea | 49:111 |
| Select | 34:3 | DatePicker | 36:3 |
| Checkbox | 39:3 | FileDropzone | 49:132 |
| FormField | 14:146 | Badge | 46:3 |
| Avatar | 14:151 | Stat | 14:153 |
| ListItem | 48:6 | Card | 48:38 |
| DescriptionList | 49:179 | Timeline | 49:209 |
| Chart | 53:4 | NavItem | 14:152 |
| PageHeader | 57:3 | EmptyState | 14:155 |
| Alert | 81:5545 | Toast | 31:3 |
| Dialog | 49:3 | Utilities | 48:3 |
| ApplicationCard | 14:154 | StatusSelect | 14:148 |
| AddApplication | 57:54 | ApplicationDetail | 59:2229 |
| Charts | 14:156 | Sidebar | 14:157 |
| MobileTopBar | 14:158 | MobileNav | 82:3 |
| Screens | 4:4 | | |

Done so far: Spinner 81:3, Button and IconButton 14:144.

### Things learned so far

- **Password toggle:** the `eye` animation is useAnimations `visibility`, a toggle. Its static states run eye-off then eye, so check which `active` value shows which glyph before wiring PasswordInput (the spec: `eye` while hidden, `eye-off` while visible). The Icons page also has static `eye` and `eye-off`.
- **Toasts and the pine band render in Dark mode** (per the IconButton spec). With `light-dark()` tokens that's just `[color-scheme:dark]` on the element.
- **Color inheritance with local color-scheme:** `color` is resolved where it's set, so an element that sets `color-scheme` must also set its own text color (`text-text-primary`), or it inherits the outer mode's color.
- **Vite reloads:** the first test run after adding a new dependency can fail with "Vite unexpectedly reloaded a test". Rerun; if it keeps happening, add the dependency to `optimizeDeps.include` in `vite.config.ts`.
- **Trash icon:** stays animated by choice, though its resting lid differs slightly from the Figma glyph.
- **No `any`, no `dark:` variants, no primitives in components.**

## Decisions

- **Patterns are a reference, not a code layer.** The Figma Patterns pages guide the screen builds. A pattern that several screens reuse becomes an ordinary component in `src/components`:
  - ApplicationCard
  - StatusSelect
  - ApplicationForm (Add and Edit)
  - the app shell pieces (Sidebar, MobileNav)

  Pieces used by only one page live with that page.
- **No headless UI library.** Everything is built by hand on platform features:
  - `<dialog>` with `showModal()` for Dialog, the alertdialog and the MobileNav panel. It gives us the top layer, an inert background, Esc and `::backdrop`.
  - The Popover API for the Select menu and the DatePicker calendar.
  - Keyboard handling (listbox and grid navigation) is ours to write and test in play functions.
- **Unlikely logic stays as is.** The nightly job already moves Applied to Unlikely 14 days after `date_applied` (`backend/app/services/scheduler.py`). Cards show "No activity since {date_applied}". The Unlikely list sorts by `date_applied`, oldest first.
- **Rejected list includes Role Eliminated** (same as `useApplicationCounts` today). It reuses the Unlikely layout.
- **Edit reuses the Add application dialog**, prefilled.
- **Old code is replaced, not migrated.** The new components are built alongside the old ones. Pages switch over in Phase 4, and the old files are deleted in Phase 5.

## Phase 0: Foundations ✅

- [x] Fonts: `@fontsource/gabarito` (700) and `@fontsource-variable/atkinson-hyperlegible-next` (wght), imported in `main.tsx` and `.storybook/preview.tsx`; the Google Fonts import is removed
- [x] Tokens in `src/styles/tokens.css`, read from the Figma variables in both modes:
  - primitives on `:root` only (no utilities)
  - semantic `color/*`, tone and chart in `@theme`, written with `light-dark()`
  - radius, `shadow-overlay`, `blur-backdrop`, easing in `@theme`; durations as `--duration-*` on `:root`
- [x] Text styles as `@theme` `--text-*` entries (size, line height, tracking, weight): `text-heading-h1`, `text-body-small`, and so on. Headings add `font-display`
- [x] `cn()` knows the custom text, shadow, blur and ease keys (`src/lib/cn.test.ts`)
- [x] Dark mode: `light-dark()` plus `color-scheme`. The app follows the OS; Storybook has a Theme toolbar, and a story can pin `globals: { theme: 'dark' }`. (This replaces the planned `[data-theme]` selector.)
- [x] Reduced motion: the global "zero every transition" rule is removed; components handle it with `motion-safe:` / `motion-reduce:`
- [x] Storybook loads only the design system (`.storybook/preview.css`), not the legacy app CSS; `vitest.config.ts` now extends `vite.config.ts` so story tests run with Tailwind
- [x] Icon: 33 icons exported from Figma into `Icon.paths.ts`, rendered with `currentColor`
- [x] `Foundations/Tokens` story for checking tokens visually in both modes

## Phase 1: Components

Each component needs:
- scaffolding with plop;
- an implementation built from `get_design_context` on its Figma page;
- stories with play functions, passing in light and dark;
- a clean `pnpm test:storybook` and `pnpm exec tsc --noEmit`.

Basics
- [x] Icon (static, for non-interactive places)
- [x] AnimatedIcon (`react-useanimations`, for icons on interactive elements; loaded per icon on demand)
- [x] Spinner
- [x] Button (Strong, Primary, Secondary, Ghost, Danger)
- [x] IconButton

Inputs
- [ ] Input (leading icon, trailing slot, single-line ellipsis)
- [ ] PasswordInput (Input plus the show/hide toggle; `aria-pressed`; keeps the cursor position)
- [ ] Textarea
- [ ] Checkbox
- [ ] FormField (label, optional, control, hint, error)
- [ ] Select (field | badge), with parts Trigger, BadgeTrigger, Menu, Option and Swatch (Popover API)
- [ ] DatePicker (Popover API, calendar grid with keyboard navigation)
- [ ] FileDropzone (PDF only, 10MB max)

Display
- [ ] Badge
- [ ] Avatar (falls back to initials when the image is missing or broken)
- [ ] Stat
- [ ] ListItem
- [ ] Card
- [ ] DescriptionList, with part Item (`divide-y`, Stacked layout)
- [ ] Timeline, with part Item (Position Middle | Last; Actor User | System)
- [ ] Chart, with parts Bar, Donut and LegendItem (hand-built SVG/CSS; replaces `recharts`)
- [ ] EmptyState

Navigation and layout
- [ ] NavItem
- [ ] PageHeader (band | plain)

Feedback and overlays
- [ ] Alert (Danger | Warning | Info | Positive)
- [ ] Toast, plus a toaster provider
- [ ] Scrim
- [ ] Dialog:
  - sizes
  - a sheet below md
  - the Small alertdialog
  - the header line that appears on scroll

## Phase 2: Backend and shared

- [ ] Collect the name at sign-up in Supabase `user_metadata.full_name`. Existing users without a name fall back to the part of their email before the @.
- [ ] Replace `STATUS_COLORS` in `@jobtracker/shared` with a map from status to tone (`neutral | info | warning | positive | danger`). Unlikely maps to neutral/soft.
- [ ] Counts: Active excludes Unlikely, and Unlikely gets its own count (`useApplicationCounts`)

## Phase 3: Shared domain components

Built from the Figma Patterns pages:
- [ ] StatusSelect (Select badge appearance plus the tone map)
- [ ] ApplicationCard (ListItem plus the trailing column; "No activity since" for Unlikely)
- [ ] ApplicationForm:
  - field order and the two-column grid as designed
  - link fetch with a Spinner in the URL input
  - fetch results fill only empty fields
  - used for both Add and Edit
- [ ] Sidebar (nav with counts, account block)
- [ ] MobileTopBar
- [ ] MobileNav (the trigger, a panel in a `<dialog>`, staggered enter, focus returns to the trigger)
- [ ] Bottom bar

## Phase 4: Screens

Check each screen against its Figma frame, in light and dark, at 1440 and 390 wide.

- [ ] Login, and Login error (keeps the email, clears the password, no field-level error)
- [ ] Sign up, and Sign up error (errors on blur or submit; focus moves to the first invalid field)
- [ ] App shell (Sidebar at md and up; MobileTopBar, MobileNav and Bottom bar below md)
- [ ] Dashboard ("Welcome, {first name}", 7 stats, two chart cards)
- [ ] Jobs: Active (grouped by Interviewing, Offers and Applied; search; a toast on status change)
- [ ] Jobs: Unlikely (one list, oldest first, explanatory header)
- [ ] Jobs: Rejected (Unlikely layout; includes Role Eliminated)
- [ ] Jobs: Empty
- [ ] Add application dialog (desktop dialog, mobile sheet, fetching state)
- [ ] Edit application (same dialog, prefilled)
- [ ] Application detail (Details and Status history cards, low-emphasis Delete)
- [ ] Delete application alertdialog

## Phase 5: Cleanup

- [ ] Delete the old components in `src/components/*.tsx` and the old page code
- [ ] Remove the legacy block from `index.css` (old tokens, `!important` dark overrides, `.form-input`, modal keyframes). `index.css` should end up as just the Tailwind, `tokens.css` and `base.css` imports
- [ ] Reset Tailwind's default palette (`--color-*: initial`) so only design tokens generate color utilities
- [ ] Zero-leftovers check: grep `src/` for anything from the old system and expect no hits:
  - old variables: `var(--color-primary)`, `--color-background`, `--color-surface`, `--color-text)`, `--color-border)`, `--shadow-sm|md|lg|xl`, `--space-*`, `--z-*`
  - old palette classes: `teal-`, `slate-`, `gray-`, `red-`, `emerald-`, `blue-`, `bg-white`
  - `form-input`, `animate-modal-*`, `Plus Jakarta`
  - `STATUS_COLORS` in `@jobtracker/shared`
- [ ] Build the app and confirm the emitted CSS has no default Tailwind palette variables (`--color-teal-*`, `--color-slate-*`, and so on)
- [ ] Remove `recharts`
- [ ] Update CLAUDE.md and the plop templates for any new conventions

## Not designed yet (out of scope for this pass)

- Unlikely and Empty on mobile (adapt the existing mobile layouts)
- Settings
- Onboarding beyond the empty state
