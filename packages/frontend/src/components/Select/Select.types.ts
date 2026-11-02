import type { AriaAttributes } from 'react'
import type { Tone } from '../../lib/tone'
import type { BadgeAppearance } from '../Badge/Badge.types'

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  disabled?: boolean
  /** A leading Swatch in the menu. With `appearance="badge"`, also the badge's tone while selected. */
  tone?: Tone
  /** With `appearance="badge"`: the badge's appearance while selected. Defaults to solid. */
  badgeAppearance?: BadgeAppearance
}

export interface SelectProps<V extends string = string> {
  options: readonly SelectOption<V>[]
  /** Controlled value; `null` shows the placeholder */
  value?: V | null
  defaultValue?: V
  onChange?: (value: V) => void
  /** Fires when focus leaves the trigger (React Hook Form's `onBlur`) */
  onBlur?: () => void
  placeholder?: string
  /** `field` looks like Input (the default); `badge` is the compact trigger for lists */
  appearance?: 'field' | 'badge'
  disabled?: boolean
  /** Adds a hidden input, so the value submits with a native form */
  name?: string
  id?: string
  /** Needed with `appearance="badge"`, which has no visible label */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Classes for the trigger */
  className?: string
}
