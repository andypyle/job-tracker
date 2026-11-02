import type { InputHTMLAttributes, ReactNode } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  /** Smaller text under the label */
  description?: ReactNode
  /** Error message. Replaces the description and marks the checkbox aria-invalid. */
  error?: ReactNode
  /** Shows the dash. Set through the DOM property; clicking clears it natively. */
  indeterminate?: boolean
  /** Classes for the row (the label element). The ref and other props go to the `<input>`. */
  className?: string
}
