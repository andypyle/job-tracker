import { cva } from 'class-variance-authority'

// The soft fill and a 3px accent edge, radius-sm, 12px from the icon to the text. The edge takes
// 3px of the 16px left padding, so the content sits where Figma puts it. Drops in on mount.
export const alertVariants = cva(
  [
    'flex items-start gap-3 rounded-sm border-l-3 py-3 pr-4 pl-[calc(--spacing(4)-3px)] text-body-base break-words',
    'outline-none animate-drop-in motion-reduce:[--drop:0px]',
  ],
  {
    variants: {
      tone: {
        danger: 'border-tone-danger-accent bg-tone-danger-soft text-tone-danger-on-soft',
        warning: 'border-tone-warning-accent bg-tone-warning-soft text-tone-warning-on-soft',
        info: 'border-tone-info-accent bg-tone-info-soft text-tone-info-on-soft',
        positive: 'border-tone-positive-accent bg-tone-positive-soft text-tone-positive-on-soft',
      },
    },
    defaultVariants: {
      tone: 'danger',
    },
  },
)

/** The icon is the accent color, a step stronger than the text */
export const alertIconColor = {
  danger: 'text-tone-danger-accent',
  warning: 'text-tone-warning-accent',
  info: 'text-tone-info-accent',
  positive: 'text-tone-positive-accent',
} as const
