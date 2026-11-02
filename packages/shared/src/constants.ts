import type { ApplicationStatus } from './types.js'

/** The design system's color families (color/tone/*). Matches `Tone` in the frontend's `lib/tone.ts`. */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'positive' | 'danger'

/** Badge appearances a status can take. */
export type StatusAppearance = 'solid' | 'soft' | 'outline'

/** How each status is drawn (Badge, StatusSelect, Swatch), from the Figma StatusSelect pattern. */
export const STATUS_TONES: Record<
  ApplicationStatus,
  { tone: StatusTone; appearance: StatusAppearance }
> = {
  Applied: { tone: 'info', appearance: 'solid' },
  Interviewing: { tone: 'warning', appearance: 'solid' },
  Offer: { tone: 'positive', appearance: 'solid' },
  Rejected: { tone: 'danger', appearance: 'soft' },
  Unlikely: { tone: 'neutral', appearance: 'soft' },
  'Role Eliminated': { tone: 'neutral', appearance: 'outline' },
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Applied: 'Applied',
  Interviewing: 'Interviewing',
  Unlikely: 'Unlikely',
  Offer: 'Offer',
  Rejected: 'Rejected',
  'Role Eliminated': 'Role Eliminated',
}
