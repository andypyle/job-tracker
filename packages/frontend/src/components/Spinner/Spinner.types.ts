import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { spinnerVariants } from './Spinner.variants'

export interface SpinnerProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  /** Visually hidden status text, announced to screen readers. Describe the wait: "Getting details". */
  label?: string
}
