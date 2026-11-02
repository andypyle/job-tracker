import type { HTMLAttributes, ReactNode } from 'react'

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  label: ReactNode
  /** Shows "Optional" after the label */
  optional?: boolean
  /** Help text under the control. Hidden while there's an error. */
  hint?: ReactNode
  /** Error message under the control. Also marks the control aria-invalid. */
  error?: ReactNode
  /** The control's id. Generated when omitted; the control picks it up from context. */
  htmlFor?: string
  /** One control: Input, PasswordInput, Textarea or Select */
  children: ReactNode
}
