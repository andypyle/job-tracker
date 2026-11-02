# Design overhaul plan

Implements the JobTracker design system from Figma:
https://www.figma.com/design/ajjKIbesu4oY79EfQIX7Ov/JobTracker

Branch: `design-overhaul`. Design decisions and rules live in the Figma file and in the design notes. This file tracks the build.

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
- `react-useanimations` is deferred to MobileNav, its only planned use

## Phase 1: Components

Each component needs:
- scaffolding with plop;
- an implementation built from `get_design_context` on its Figma page;
- stories with play functions, passing in light and dark;
- a clean `pnpm test:storybook` and `pnpm exec tsc --noEmit`.

Basics
- [x] Icon
- [ ] Spinner
- [ ] Button (Strong, Primary, Secondary, Ghost, Danger)
- [ ] IconButton

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
