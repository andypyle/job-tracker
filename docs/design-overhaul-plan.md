# Design overhaul plan

Implements the JobTracker design system from Figma:
https://www.figma.com/design/ajjKIbesu4oY79EfQIX7Ov/JobTracker

Branch: `design-overhaul`. Design decisions and rules live in the Figma file and in the design notes. This file tracks the build.

## Picking this up in a new session

Read this file and CLAUDE.md first. **Next up: Stat**, then the rest of Phase 1 in order.

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

Done so far: Spinner 81:3, Button and IconButton 14:144, Input 14:145 (PasswordInput is Input plus the trailing slot), Textarea 49:111, Checkbox 39:3, FormField 14:146, Select 34:3, Badge 46:3, DatePicker 36:3, FileDropzone 49:132, Avatar 14:151.

### Things learned so far

- **Password toggle:** useAnimations `visibility` rests on `eye` and ends on `eye-off`, so PasswordInput passes `active={visible}`.
- **Form controls and FormField:** FormField provides `{ id, describedBy, invalid }` through context (`FormField.context.ts`). New controls (Select, DatePicker) should call `useFieldControlProps(props)` so the label, hint/error and `aria-invalid` wire up on their own.
- **2px borders without a shift:** fields keep a 1px border and add `inset-ring-1` in the same color for focus and error (`fieldFrame` in `src/lib/classes.ts`). Error wins over focus.
- **Asset downloads from `get_design_context`:** the shell is zsh, so loop over URL pairs without relying on word splitting. Box SVGs are useful for reading exact geometry and colors (the checkbox check path came from one).
- **Toasts and the pine band render in Dark mode** (per the IconButton spec). With `light-dark()` tokens that's just `[color-scheme:dark]` on the element.
- **Color inheritance with local color-scheme:** `color` is resolved where it's set, so an element that sets `color-scheme` must also set its own text color (`text-text-primary`), or it inherits the outer mode's color.
- **Vite reloads:** the first test run after adding a new dependency can fail with "Vite unexpectedly reloaded a test". Rerun; if it keeps happening, add the dependency to `optimizeDeps.include` in `vite.config.ts`.
- **Trash icon:** stays animated by choice, though its resting lid differs slightly from the Figma glyph.
- **Popovers:** `useAnchoredPopover` (`src/hooks`) shows a `popover="manual"` element, positions it from the anchor's rect (flipping above when there's more room), and closes it on a press outside. Classes are `popoverSurface` and `popoverMotion` in `src/lib/classes.ts`. In Select, focus stays on the trigger, which owns the keyboard through `aria-activedescendant`; the menu's `onMouseDown` prevents default so clicks don't steal focus. Closing is ours: Esc (with `stopPropagation`, so a surrounding Dialog stays open), blur, and a capture `pointerdown` outside. `auto` popovers were avoided because light dismiss fights the trigger's own click.
- **Popover motion is CSS only:** `transition-discrete` on `display`/`overlay` plus `starting:open:` for the enter (`popoverMotion`). `open:` matches `:popover-open`, and it outranks the closed-state classes by specificity.
- **React 18 and `popover`:** the attribute passes through, but the type comes from `src/types/popover.d.ts`.
- **FormField exposes `labelId`** in its context, for parts that need the label as well (the Select listbox's `aria-labelledby`).
- **Tones:** `Tone` and `tones` live in `src/lib/tone.ts`. Swatch is its own component (Chart legends need it too), not a Select part.
- **Dates** are `YYYY-MM-DD` strings throughout (`src/lib/calendarDate.ts`, unit tested): they match `date_applied` and compare as strings. No date library.
- **DatePicker:** focus moves into the grid (roving tabindex); Esc returns it to the calendar button, choosing a day returns it to the input. Typed text is read on blur or Enter; bad text sets `aria-invalid` and calls `onInvalidInput`, and the form shows the FormField message. Month changes keep the old grid mounted (aria-hidden) for the 120ms slide-out, so query the live grid, not the wrapper.
- **Deviation:** outside-month days use text/muted, not Figma's text/subtle, which is 2.7:1 on the dark overlay (they're selectable, so they need 4.5:1). Worth fixing in Figma.
- **FileDropzone is controlled:** the parent owns `value`, `progress` and `error`; the dropzone checks type and size (`MAX_UPLOAD_BYTES`, `formatFileSize` in `src/lib/fileSize.ts`) and only calls `onSelect` with a valid PDF. Clearing `progress` while `value` is set shows Complete (about 400ms of drawing plus the 800ms hold), then Filled. On cancel, clear both `progress` and `value`.
- **Enter motion after mount only:** `starting:` fades are applied once the component has mounted, so a form that opens with a file attached doesn't animate. Story tests that check an element right after an interaction should wait for it to finish fading (`toBecomeVisible` in the FileDropzone stories).
- **AnimatedIcon** now takes `autoplay` (skipped under reduced motion; the library's explicit autoplay ignores it) and `speed`. `loadIconAnimation(name)` in `AnimatedIcon.animations.ts` warms up a chunk ahead of time. The `check` Lottie runs 1.47s, so FileDropzone plays it at 3.6×.
- **`animate-pop-in`** starts from `--pop-from` (0.85 by default; FileDropzone uses 0.9).
- **Drop events in story tests:** dispatch a native `DragEvent` with a real `DataTransfer`. `fireEvent.drop` rebuilds the dataTransfer from its own keys, so the files arrive empty.
- **Deviation:** the row's remove motion is a fade with a slight `scale-y`, not a height collapse, since the empty zone (112px) is taller than the row (64px).
- **Avatar** takes `src`, `initials` and `icon` and shows the first that works; a broken `src` is remembered, so a new one gets a fresh try. `getInitials(name)` is in `src/lib/initials.ts`. `alt` names the avatar whichever content shows (on the `<img>`, or `role="img"` on the wrapper); without it the avatar is decorative. Use it for company logos, since OpenGraph logos are often missing.
- **Deviation:** the lg icon is 24px, not Figma's 25, to keep the 24px grid whole. lg initials use Heading/H3 (20/28), not Figma's 16px, which looked too small in 56px (sm 12, md 16, lg 20). Worth fixing in Figma.
- **Stale Tailwind in the Storybook dev server:** new component files created while `pnpm storybook` is running may not get scanned, so classes only they use (Avatar's `size-8`, `size-14`) are missing and the story looks broken while tests pass. `touch .storybook/preview.css` makes it rescan. Compare against the dev server, not only a static build.
- **Story size checks** use `getComputedStyle`, not `getBoundingClientRect`, which the Storybook zoom tool scales.
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
- [x] Input (leading icon, trailing slot, single-line ellipsis)
- [x] PasswordInput (Input plus the show/hide toggle; `aria-pressed`; keeps the cursor position)
- [x] Textarea
- [x] Checkbox
- [x] FormField (label, optional, control, hint, error)
- [x] Select (field | badge), with parts Trigger, BadgeTrigger, Menu and Option (Popover API); Swatch is a separate component
- [x] DatePicker (Popover API, calendar grid with keyboard navigation), with parts Calendar and DayCell
- [x] FileDropzone (PDF only, 10MB max), with part FileRow

Display
- [x] Badge
- [x] Swatch
- [x] Avatar (falls back to initials when the image is missing or broken)
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
