import { cva } from 'class-variance-authority'

export const spinnerVariants = cva(
  'm-auto inline-flex shrink-0 motion-safe:animate-spinner motion-reduce:animate-pulse-opacity',
  {
    variants: {
      size: {
        sm: 'size-4',
        md: 'size-5',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
)
