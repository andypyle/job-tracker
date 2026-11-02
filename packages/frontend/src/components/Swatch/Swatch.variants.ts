import { cva } from 'class-variance-authority'

export const swatchVariants = cva('inline-block size-3 shrink-0 rounded-xs', {
  variants: {
    tone: {
      neutral: 'bg-tone-neutral-solid',
      info: 'bg-tone-info-solid',
      warning: 'bg-tone-warning-solid',
      positive: 'bg-tone-positive-solid',
      danger: 'bg-tone-danger-solid',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
})
