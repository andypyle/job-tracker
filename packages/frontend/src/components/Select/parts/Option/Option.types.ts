import type { HTMLAttributes } from 'react'
import type { Tone } from '../../../../lib/tone'

export interface OptionProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  /** Keyboard or pointer highlight (the listbox's aria-activedescendant) */
  active?: boolean
  /** Semibold with a check */
  selected?: boolean
  disabled?: boolean
  /** A leading Swatch in this tone */
  tone?: Tone
}
