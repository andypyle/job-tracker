# Design overhaul plan

Implements the JobTracker design system from Figma:
https://www.figma.com/design/ajjKIbesu4oY79EfQIX7Ov/JobTracker

Branch: `design-overhaul`. Design decisions and rules live in the Figma file and in the design notes. This file tracks the build.

## Picking this up in a new session

Read this file and CLAUDE.md first. Phases 1 and 2 are done. **Next up: Phase 3** (shared domain components), in order.

### Workflow per component

1. Load the `figma:figma-design-to-code` skill, call `create_session` for file key `ajjKIbesu4oY79EfQIX7Ov`, then `get_metadata` on the component's page (IDs below) to find the component set, and `get_design_context` on it. Its "Component descriptions" are the spec: sizes, states, motion, a11y.
2. Scaffold with plop (CLAUDE.md), then adapt the reference code to our tokens and components. Reuse `Icon`/`AnimatedIcon`, `focusRing` and `colorTransition` from `src/lib/classes.ts`, and `cn()`.
3. Stories with play functions, plus a dark story (`globals: { theme: 'dark' }`).
4. `pnpm exec tsc --noEmit` and `pnpm test` from `packages/frontend`.
5. Compare visually: `pnpm build-storybook -o <tmp>/sb --quiet`, then `node scripts/screenshot-stories.mjs <tmp>/sb <tmp> <story-id>...`, against `get_screenshot` of the Figma component set (the component pages also have a "Light and dark" frame). If `pnpm storybook` is running, `touch .storybook/preview.css` first and check sizes there too: a static build always scans every file, so it hides the stale-Tailwind problem below.
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

Done so far: Spinner 81:3, Button and IconButton 14:144, Input 14:145 (PasswordInput is Input plus the trailing slot), Textarea 49:111, Checkbox 39:3, FormField 14:146, Select 34:3, Badge 46:3, DatePicker 36:3, FileDropzone 49:132, Avatar 14:151, Stat 14:153, ListItem 48:6, Card 48:38, DescriptionList 49:179, Timeline 49:209, Chart 53:4 (as BarChart and DonutChart), EmptyState 14:155, NavItem 14:152, PageHeader 57:3, Alert 81:5545, Toast 31:3 (with Toaster), Dialog 49:3 (Scrim is its `::backdrop`).

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
- **Stat** takes `value: number | string`. A number counts up when it changes (`useCountUp` in `src/hooks`: duration/slow read from `--duration-slow`, ease/out through `easeOut` in `src/lib/easing.ts`; reduced motion jumps) and goes through `format` (e.g. ``(n) => `${n}%` ``); a string such as "—" shows as is. The first value doesn't animate; a value arriving after `loading` counts up from 0. Screen readers get the final value from an sr-only copy, not the frames.
- **Tone rule without a shift:** subtle Stat's 4px top border trades for `pt-4`, so every stat stays 132px as in Figma (strokes there don't affect layout).
- **Loading Stat** is always the neutral subtle surface (Figma's only loading variant), `aria-busy`, with the label in sr-only text. The skeleton pulses with `animate-pulse-opacity` (opacity only, so it runs under reduced motion too); Figma's is static.
- **Slot is `children`:** a Figma Slot instance (the dashed "Slot: swap content" box in ListItem, Card, Dialog) is a placeholder, not a component. In React it's `children`, and stories show real content in its place.
- **ListItem is a composable row**, not a set of text props (title/subtitle/meta hard-coded ApplicationCard's shape). `<ListItem selected? enter?>` is the `<li>` (wrap rows in a `<ul>`) and lays out its children 16px apart: a leading Avatar/Swatch/icon, a `ListItemText` (flex-1 column, Body/Small text/muted by default) holding a `ListItemTitle` (Title/Base) and further lines, then trailing content. Both parts are re-exported from `ListItem.tsx`. A router `<Link>` inside `ListItemTitle` stretches over the row with `::after`, which also draws the focus ring; the row positions links, buttons and inputs (`:where`, so the title link's own `static` wins) so they paint above the overlay. Hover only applies when the title holds a link (`has-[[data-list-item-title]_a]`). On a selected row, give the link `aria-current` yourself. `enter` plays `animate-rise-in` (new token); set it only on rows added after the list rendered. FLIP reordering is the list's job, for the Jobs list in Phase 3/4.
- **Row height:** Figma's 80px row has 16px padding, but its three text lines (62px) overflow it, so the row is `min-h-20` with `py-2` and centered content: 80px either way.
- **Deviation:** a selected row's subtitle and meta are text/primary, because text/muted on bg/nav-active is 3.4:1 in Dark mode. Also in Dark mode, avatar/bg and bg/nav-active are both pine-800, so an initials avatar blends into a selected row. Both are worth fixing in Figma.
- **Testing hover and overlays:** `userEvent.hover` doesn't trigger CSS `:hover` (check the class instead), and `userEvent.click(el)` skips hit testing, so to test what a pointer lands on, click `document.elementFromPoint` at the element's center.
- **Card** is composable too, not Figma's `title`/`action` props: `<Card padding="default|flush"><CardHeader><CardTitle>…</CardTitle><Button /></CardHeader>{body}</Card>`. It's a `<section>`; `CardTitle` (an h2 by default, `as` for h3/h4, always Heading/H3) takes an id from `Card.context.ts` and reports itself, so `aria-labelledby` only appears when there is a title. `CardHeader` reads the padding from context: flush adds the padding and the border/subtle divider, with the divider taking 1px of the bottom padding so the header is Figma's 60px.
- **DescriptionList** is a `<dl>` and a size container; `<DescriptionListItem label="Compensation">$165k–$190k</DescriptionListItem>` is a `<div>` with `<dt>`/`<dd>`. Items stack below `@lg` (32rem, the list's width, not the viewport's) and go inline with a 160px label column from there. Each item draws its own divider below (the last one too, as in Figma), inside the bottom padding: 48px inline, 72px stacked. An empty value (null, undefined, false, '') reads "Not set" in text/muted.
- **Story decorators nest:** a story's decorators wrap inside the meta's, they don't replace them. To vary a wrapper per story, read a story parameter in the meta decorator (`parameters.stacked` in the DescriptionList stories).
- **Composable only where content varies.** Shells with children and parts (ListItem, Card, Dialog) are for components whose insides change from use to use. When the design fixes the structure, use props, with ReactNode props for slots. Timeline was first built with parts and then switched to props.
- **Timeline** is an `<ol>` of `<TimelineItem actor="user|system" badge={<Badge/>} time="Oct 9, 2026 · 3:14 PM" dateTime="2026-10-09T15:14">event text</TimelineItem>`. The props are a union, so `actor="system"` can't take a `badge` (Figma: system events have no badge). Figma's Position=Last is `last:` (no line, 4px bottom padding), so there is no position prop. The actor sets the text color (user text/primary, system text/muted) and the marker (solid brand/default, or hollow border/strong on bg/surface). The rail is `aria-hidden`. As in Figma, items are 20px apart and the content keeps 20px of its own, so the line stops short of the next marker.
- **Charts** are two components with a `data` array of `{ label, value }` and a required `label` (the screen-reader summary, on a `role="group"`):
  - **BarChart:** bars in chart/single, scaled so the tallest fills 90% of the 160px plot (Figma's 144px), max 28px wide in equal `flex-1` columns, on four decorative chart/grid lines. Each bar is a `role="img"` named "{label}: {value}"; the plot is one tab stop with arrow keys, Home and End (roving tabindex). A hovered or focused bar shows its value above it in Caption/Medium (not designed in Figma; worth adding). `formatValue` sets how values read. Below 360px of chart width (`@container`), every other x label is hidden. Bars grow with `animate-grow-up` (new token), 30ms apart.
  - **DonutChart:** SVG circles with `pathLength={360}`, so dash lengths and offsets are degrees; rotated to start at 12 o'clock; each segment stops 1.7° short (Figma's gap). Series colors go in order, series-1 to series-5. The sweep is a mask circle with `animate-sweep` (new token). The mask needs `maskUnits="userSpaceOnUse"` and an explicit region: the default (stroke-less bounding box plus 10%) clips the ring's outer edge. The total counts up from 0 on mount via `useCountUp` (started from `null`), with an sr-only final copy. `total` overrides the sum. Outside 2 to 5 categories, it warns in dev.
  - **Deviation:** the legend draws its own 10px chart-series square instead of using Swatch, which is a 12px tone chip.
- **EmptyState** takes `title` (Heading/H2; `titleAs` for the level, h2 by default), `description` (Body/Base text/muted, wrapping at 320px, about 2 lines) and `action` (a Primary Button, or a link styled as one). There's no icon: the component's Figma description says "No decorative icon", which overrides the page note about a 64px tile.
- **NavItem** wraps react-router's `NavLink`: `<NavItem to icon level="top|sub" count? end?>Label</NavItem>`. NavLink sets `aria-current="page"`, and the styles key off that (`aria-[current=page]:`), so there's no `active` prop. Hover is `not-aria-[current=page]:hover:` so it doesn't cover the active background. The icon goes through AnimatedIcon (20px top, 16px sub), text/muted and text/nav-active when active. NavLink matches by prefix, so `/jobs` is active on `/jobs/active`; pass `end` where that's unwanted. Stories wrap it in a `MemoryRouter`.
  - **Not done here:** the rail sliding to the new item on route change. It needs a single rail shared across the list, so it belongs to Sidebar (Phase 3).
  - **Deviation to fix in Figma:** in Dark mode, tone/neutral/soft and bg/nav-active are both pine-800, so the count Badge loses its shape on the active row (the number still reads).
- **PageHeader** is a `<header>`: `<PageHeader appearance="band|plain" title description? back={{ to, label }}? actions?>`. The title is the page's h1 (Heading/H1, Heading/H2 below md). `back` renders a router `Link` styled with `buttonVariants({ variant: 'ghost' })` plus the animated arrow-left, pulled left 16px so the arrow lines up with the title as in Figma. Below md the actions wrap under the title and the side padding drops to 16px (my choice; Figma only specifies 40px). The band's hairline takes 1px of its bottom padding (134px, as in Figma).
  - **Not done here:** the sticky bottom bar for actions below md. That's the app shell's Bottom bar (Phase 3).
  - **Untested:** the below-md layout. Story tests run at one viewport, and there's no viewport setup yet; check it at 390px when the screens are built.
- **Alert** is `<Alert tone="danger|warning|info|positive">message</Alert>`. Danger is `role="alert"`, the others `role="status"`. The tone picks the soft fill, the 3px accent edge (taking 3px of the left padding), the static icon in the accent color (alert-circle, alert-triangle, info, check-circle) and the on-soft text. It forwards a ref and has `tabIndex={-1}`, so a form can focus it after a failed submit (`FocusAfterSubmit` story). It enters with `animate-drop-in` (new token: fade plus 4px down, ease/out, no bounce; reduced motion sets `--drop: 0px`). The icon is nudged 2px down to center on the first line, where Figma has it at the top of the row.
- **Toasts:** call `toast({ tone, title, message?, action?: { label, onClick }, duration?, dismissible? })` from `src/lib/toast.ts` anywhere (a module store read with `useSyncExternalStore`, unit tested), and render `<Toaster />` once in the layout (Phase 3/4).
  - **Toast** is the drawing: pinned to Dark mode on bg/band, a 4px tone edge, the tone's static icon in its accent color, Title/Base and Body/Small text, an optional ghost action and a dismiss IconButton. Danger is `role="alert"`, the rest `role="status"`.
  - **Deviation (spacing):** the action and the dismiss button sit together, both 44px targets centered on the title line (-11px margins keep the toast 80px). The action's padding drops to 12px to match the icon's inset, so text→action and action→× are both 24px; in Figma the 20px action padding leaves 44px before the ×. The × target is inset 5px from the right, the same as from the top (centering on the title line sets that), so the glyph is 17px from both edges; it used to be pulled to 2px, so its hover hugged the border. Worth fixing in Figma.
  - **Toaster** is a `<section aria-label="Notifications">`, bottom-right 24px from md, 16px insets above the safe area below. Newest at the bottom; a 4th marks the oldest leaving. Timers default to 5s, 8s for warning, and none for danger; they hold, keeping the time left, while the stack is hovered or focused. Touch and pen can swipe down or right to dismiss; the pointer is captured only after 8px, so taps still reach the buttons.
  - **Motion** runs on the Web Animations API from the tokens (`readDuration`, `readEasing` and `prefersReducedMotion` in `src/lib/motion.ts`; `useCountUp` and DonutChart now use them too). Enter: up 16px from 0.98 scale over duration/slower (new token, 400ms) with ease/bounce, with the fade run separately over duration/base with ease/out. Both wait duration/fast (`fill: 'backwards'`): the older toasts start their FLIP in the slot the new one takes, and fading in on top of them while they're still there read as a flash on the bottom toast. Siblings FLIP (`translate`, `composite: 'add'`) over duration/slower with ease/bounce. Exit: right 24px with a fade over duration/base with ease/in, then the record is removed and the siblings FLIP into the gap. Reduced motion: opacity only, 120ms.
  - **Deviation:** Figma's notes say 280ms in and 120ms out, which felt abrupt, so enter and reflow are 400ms and exit is 200ms. A fade tied to the bounce curve also popped, because the curve covers most of its distance in the first frames. Worth updating the Figma notes and adding duration/slower to the variables.
  - **FLIP details:** leaving toasts FLIP too, so when a 4th pushes the oldest out it rises with the stack while it exits instead of jumping up first (the FLIP's added translate stacks on the exit's). Positions are layout positions (the section's top plus `offsetTop`), not `getBoundingClientRect`, which includes running animations and would restart an in-flight bounce as a 1px move.
  - **Checking motion frame by frame:** record each element's rect, opacity and computed `translate` in a `requestAnimationFrame` loop from Playwright against a static Storybook build. It found both bugs above.
  - **Story tests and motion:** axe measures text mid-fade as low contrast, so plays that leave toasts animating wait on `document.getAnimations()` before ending.
- **Dialog** is a native `<dialog>` with `showModal()`: `<Dialog open onClose size="small|medium|large" role="dialog|alertdialog" title description? footer?>body</Dialog>`. The body varies, so it's children; the header and footer are props.
  - **Controlled:** Esc (`cancel`, default prevented), the close button and a press on the scrim (the click's target is the `<dialog>` itself) all call `onClose`; it closes when `open` turns false, and the browser returns focus to the trigger. An alertdialog has no close button and ignores the scrim; put `autoFocus` on the safe action.
  - **Motion is CSS only**, like the popovers: `open:` and `starting:open:` with `transition-discrete` on `display`/`overlay`, from `--dialog-y`/`--dialog-scale` (8px and 0.96; 100% and 1 for the sheet; 0 and 1 for reduced motion). The scrim is `backdrop:` utilities on the same pattern. Use `open:flex`, never `flex`, or the closed dialog shows (an author `display` beats the UA's `dialog:not([open])`). Add `border-0 p-0`: the UA gives `<dialog>` a border and padding.
  - **Body:** `min-h-0 flex-1 overflow-y-auto`, padded 24px across and below (my choice; Figma's slot is full-bleed, so check against the AddApplication pattern). Scrolling shows the header's divider (transparent until then, so nothing shifts). While it overflows it's a tab stop, since axe requires keyboard access to a scrollable region with nothing focusable inside. Without children there's no body.
  - **Page scroll:** `showModal()` makes the page inert but not still, so `base.css` has `:root:has(dialog:modal) { overflow: hidden }`.
  - **Esc in story tests:** the browser fires `cancel` only for a trusted keypress, so the stories dispatch `cancel` directly.
- **Sub-pixel borders** compute to whole device pixels in Chromium (the 1.5px system marker reads 1px at 1x), so story tests shouldn't assert exact fractional border widths.
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
- [x] Stat
- [x] ListItem
- [x] Card
- [x] DescriptionList, with part Item (Stacked layout)
- [x] Timeline, with part Item
- [x] Chart, built as two components: BarChart and DonutChart (with part ChartLegendItem); hand-built, replaces `recharts`
- [x] EmptyState

Navigation and layout
- [x] NavItem
- [x] PageHeader (band | plain)

Feedback and overlays
- [x] Alert (Danger | Warning | Info | Positive)
- [x] Toast, plus Toaster and the `toast()` store
- [x] Scrim: not a component; it's the Dialog's `::backdrop` (bg/scrim plus the backdrop blur)
- [x] Dialog:
  - sizes
  - a sheet below md
  - the Small alertdialog
  - the header line that appears on scroll

## Phase 2: Backend and shared

- [x] Collect the name at sign-up in Supabase `user_metadata.full_name`. Existing users without a name fall back to the part of their email before the @.
- [x] Replace `STATUS_COLORS` in `@jobtracker/shared` with a map from status to tone (`neutral | info | warning | positive | danger`). Unlikely maps to neutral/soft.
- [x] Counts: Active excludes Unlikely, and Unlikely gets its own count (`useApplicationCounts`)

Notes:
- No backend changes were needed: the name lives in Supabase auth, and counts are computed on the client.
- **Name:** `signUp(fullName, email, password)` in `useAuth` stores `full_name`. Read it with `getDisplayName(user)` / `getFirstName(user)` from `src/lib/userName.ts` (unit tested), which fall back to the email before the @. The old RegisterPage has a Full name field until the Sign up screen is rebuilt.
- **Tones:** `STATUS_TONES` in `@jobtracker/shared` maps each status to `{ tone, appearance }`, from the StatusSelect page: Applied info/solid, Interviewing warning/solid, Offer positive/solid, Rejected danger/soft, Unlikely neutral/soft, Role Eliminated neutral/outline. Spread it into Badge or Select. `StatusTone` duplicates the frontend's `Tone` (shared doesn't import from the frontend); TypeScript catches a drift where they meet. `STATUS_COLORS` stays, marked deprecated, because the old ApplicationDetailPage uses it; it goes in Phase 5.
- **Counts:** `statusGroup(status)` in `src/lib/statusGroup.ts` sorts statuses into the Jobs lists (active, unlikely, rejected); `useApplicationCounts` returns `{ active, unlikely, rejected, isLoading }`. The Jobs lists in Phase 4 should filter with `statusGroup` too. Until then, the old sidebar's Active count leaves out Unlikely while the old Active list still shows those applications.

## Phase 3: Shared domain components

Built from the Figma Patterns pages:
- [x] StatusSelect (Select badge appearance plus the tone map)
  - `<StatusSelect value onChange applicationName? aria-label? disabled?>`, options in Figma's menu order with `STATUS_TONES`. The label defaults to "Status: {applicationName}", so rows in a list have distinct names.
  - It owns the pattern's neutral "Moved to {status}" toast with Undo (message: `applicationName`). Undo calls `onChange(previous)` and doesn't toast again.
  - `onChange` may return a promise (pass `mutateAsync`): the new status shows at once and stays busy until the promise settles; then the toast shows. On failure the badge goes back with no toast, and reporting the error is the caller's job. The pending status is kept until `value` changes, so the badge doesn't flick back while the query refetches.
  - **Deviation:** Figma's "disabled while saving" is the new Select `busy` prop: `aria-disabled` plus `aria-busy`, ignoring input, looking like disabled. A native `disabled` would drop focus mid-list for keyboard users.
  - Stories use a `deferred()` helper for saves, since `Promise.withResolvers` isn't in the TS lib.
- [x] ApplicationCard (ListItem plus the trailing column; "No activity since" for Unlikely)
  - `<ApplicationCard application onStatusChange to? selected? enter?>` is the `<li>` (render it in a `<ul>`). The title is a router `Link` to `/jobs/detail/{id}` (`to` overrides it), stretched over the row; `selected` adds `aria-current="page"` to it.
  - Leading: a decorative md Avatar from `company_logo_url`, falling back to `getInitials(company)`. Text: title, company, then a caption meta line: `{compensation · }Applied {date}`, or `No activity since {date}` for Unlikely.
  - Trailing: StatusSelect (named "Status: {title} at {company}"; `onStatusChange` goes to its `onChange`, so pass `mutateAsync`), with a small neutral/outline Referral Badge under it, 6px apart, right-aligned.
  - `ApplicationCardSkeleton` (exported from `ApplicationCard.tsx`) is Figma's 88px loading row, `aria-hidden`, pulsing like Stat. Its padding is Figma's 16px all round, not the row's 20px across. Put `aria-busy` on the list.
  - **Dates:** `formatShortDate` (`src/lib/calendarDate.ts`) drops the year in the current year ("Oct 2"), as the Figma screens do. The component page shows "Oct 21, 2026"; the screens win.
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
