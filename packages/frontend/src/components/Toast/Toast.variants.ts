import { cva } from 'class-variance-authority'

// Always on the pine surface, pinned to Dark mode so it reads as a layer above any page. Setting
// color-scheme here means the text color must be set here too, or it inherits the page's.
// A 4px tone edge (taking 4px of the 16px left padding), shadow/overlay, radius-sm.
export const toastVariants = cva(
  [
    '[color-scheme:dark] flex min-h-20 w-full items-start gap-3 rounded-sm border-l-4 bg-bg-band py-4 pr-2 pl-3',
    'text-text-on-band shadow-overlay break-words',
  ],
  {
    variants: {
      tone: {
        neutral: 'border-tone-neutral-accent',
        info: 'border-tone-info-accent',
        warning: 'border-tone-warning-accent',
        positive: 'border-tone-positive-accent',
        danger: 'border-tone-danger-accent',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

export const toastIconColor = {
  neutral: 'text-tone-neutral-accent',
  info: 'text-tone-info-accent',
  warning: 'text-tone-warning-accent',
  positive: 'text-tone-positive-accent',
  danger: 'text-tone-danger-accent',
} as const
