import type { ButtonHTMLAttributes } from 'react'
import type { BadgeAppearance } from '../../../Badge/Badge.types'
import type { Tone } from '../../../../lib/tone'

export interface BadgeTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: Tone
  appearance?: BadgeAppearance
}
