import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/classes'

// Colors change over duration/fast with ease/out; the press scale releases with
// ease/bounce over duration/base. One shorthand, because each property needs its own timing.
const pressTransition =
  '[transition:background-color_var(--duration-fast)_var(--ease-out),border-color_var(--duration-fast)_var(--ease-out),color_var(--duration-fast)_var(--ease-out),transform_var(--duration-base)_var(--ease-bounce)]'

export const buttonVariants = cva(
  [
    'inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm px-5 text-label-base whitespace-nowrap select-none',
    pressTransition,
    focusRing,
    'motion-safe:active:scale-[0.98]',
    'disabled:pointer-events-none disabled:bg-bg-subtle disabled:text-text-subtle',
  ],
  {
    variants: {
      variant: {
        /** Chartreuse. The one main action per view. */
        primary: 'bg-primary-default text-text-on-primary hover:bg-primary-hover',
        /** Pine. A high-emphasis neutral action. */
        strong: 'bg-brand-default text-text-on-brand hover:bg-brand-hover',
        secondary:
          'border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-canvas disabled:border-transparent',
        ghost: 'text-text-primary hover:bg-bg-subtle disabled:bg-transparent',
        danger: 'bg-feedback-danger text-text-on-band hover:bg-feedback-error-hover',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)
