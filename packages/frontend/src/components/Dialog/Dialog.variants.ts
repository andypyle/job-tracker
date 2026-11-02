import { cva } from 'class-variance-authority'

// bg/overlay, radius-md, shadow/overlay, over the scrim (::backdrop: bg/scrim with the backdrop
// blur). The body scrolls between the fixed header and footer. Below md it's a sheet along the
// bottom: full width, top corners rounded, at most 90dvh.
//
// Motion is CSS only, like the popovers: @starting-style for the enter and allow-discrete so
// `display` and the top layer wait for the exit.
// - open: rises 8px and scales 0.96 to 1 over duration/slow with ease/bounce; the sheet slides
//   up from below on the same curve; the scrim fades in over duration/base with ease/out
// - close: back over duration/fast with ease/in, no bounce
// - reduced motion: fade only
export const dialogVariants = cva(
  [
    // `open:flex`, not `flex`: an author `display` would beat the UA's `dialog:not([open])` none
    'm-auto max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden open:flex',
    'rounded-md border-0 bg-bg-overlay p-0 text-text-primary shadow-overlay',
    'max-md:mb-0 max-md:max-h-[90dvh] max-md:w-full max-md:max-w-none max-md:rounded-b-none',
    // Motion
    '[--dialog-y:8px] [--dialog-scale:0.96] max-md:[--dialog-y:100%] max-md:[--dialog-scale:1]',
    'motion-reduce:[--dialog-y:0px] motion-reduce:[--dialog-scale:1]',
    'transition-[opacity,translate,scale,display,overlay] transition-discrete',
    'translate-y-(--dialog-y) scale-(--dialog-scale) opacity-0 duration-(--duration-fast) ease-in',
    'open:translate-y-0 open:scale-100 open:opacity-100 open:duration-(--duration-slow) open:ease-bounce',
    'starting:open:translate-y-(--dialog-y) starting:open:scale-(--dialog-scale) starting:open:opacity-0',
    // The scrim
    'backdrop:bg-bg-scrim backdrop:backdrop-blur-backdrop',
    'backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-(--duration-fast) backdrop:ease-in',
    'open:backdrop:opacity-100 open:backdrop:duration-(--duration-base) open:backdrop:ease-out',
    'starting:open:backdrop:opacity-0',
  ],
  {
    variants: {
      size: {
        small: 'md:w-100',
        medium: 'md:w-140',
        large: 'md:w-160',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
)
