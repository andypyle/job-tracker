// Class strings shared by several components. Kept as literals so Tailwind can find them.

/** 2px ring outside the edge, color/border/focus, keyboard focus only */
export const focusRing = 'outline-offset-0 focus-visible:outline-2 focus-visible:outline-border-focus'

/** Color and hover changes: duration/fast, ease/out, no bounce */
export const colorTransition =
  'transition-[background-color,border-color,color] duration-(--duration-fast) ease-out'
