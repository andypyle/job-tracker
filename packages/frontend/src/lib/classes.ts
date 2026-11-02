// Class strings shared by several components. Kept as literals so Tailwind can find them.

/** 2px ring outside the edge, color/border/focus, keyboard focus only */
export const focusRing = 'outline-offset-0 focus-visible:outline-2 focus-visible:outline-border-focus'

/** Color and hover changes: duration/fast, ease/out, no bounce */
export const colorTransition =
  'transition-[background-color,border-color,color] duration-(--duration-fast) ease-out'

/**
 * Enter and exit for anchored popovers (Select menu, DatePicker calendar), on CSS alone:
 * @starting-style for the enter, and allow-discrete so `display` and the top layer wait for the
 * exit. --toward-anchor is -1 below the anchor and 1 above it (from `data-placement`), so the
 * popover always moves from that edge.
 */
export const popoverMotion = [
  '[--toward-anchor:-1] data-[placement=top]:[--toward-anchor:1] origin-top data-[placement=top]:origin-bottom',
  'transition-[opacity,translate,scale,display,overlay] transition-discrete',
  // Close: duration/fast, ease/in, drifting 2px back. Reduced motion: opacity only, over 100ms.
  'opacity-0 duration-(--duration-fast) ease-in motion-reduce:duration-100',
  'motion-safe:translate-y-[calc(var(--toward-anchor)*2px)]',
  // Open: duration/base, ease/bounce, from 4px away at 96% height
  'open:opacity-100 motion-safe:open:translate-y-0 motion-safe:open:duration-(--duration-base) motion-safe:open:ease-bounce',
  'starting:open:opacity-0 motion-safe:starting:open:translate-y-[calc(var(--toward-anchor)*4px)] motion-safe:starting:open:scale-y-96',
].join(' ')

/** Undo the UA popover styles (centered, Canvas colors); useAnchoredPopover sets top and left */
export const popoverSurface =
  'inset-auto m-0 rounded-sm border border-border-default bg-bg-overlay text-text-primary shadow-overlay'

/**
 * The box of a text field (Input, Textarea): 1px border/strong on bg/surface, radius-sm.
 * Focus and error are 2px in Figma; a 1px inset ring on top of the border draws the second
 * pixel, so the text doesn't shift. Pair with the state classes for the element that holds them.
 */
export const fieldFrame =
  'rounded-sm border border-border-strong bg-bg-surface text-body-base text-text-primary transition-[border-color,box-shadow,background-color] duration-(--duration-fast) ease-out'
