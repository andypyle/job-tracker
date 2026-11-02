import type { ButtonHTMLAttributes } from 'react'

export interface TriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  placeholder: string
  /** The selected option's label; the placeholder shows without one */
  valueLabel?: string
}
