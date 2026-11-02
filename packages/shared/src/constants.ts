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

/** @deprecated Legacy Tailwind palette classes. Use `STATUS_TONES`; removed with the old pages in Phase 5. */
export const STATUS_COLORS: Record<
  ApplicationStatus,
  { bg: string; text: string }
> = {
  Applied: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Interviewing: { bg: 'bg-[#e4ede0]', text: 'text-[#4a6940]' },
  Unlikely: { bg: 'bg-gray-100', text: 'text-gray-500' },
  Offer: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-600' },
  'Role Eliminated': { bg: 'bg-slate-100', text: 'text-slate-600' },
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Applied: 'Applied',
  Interviewing: 'Interviewing',
  Unlikely: 'Unlikely',
  Offer: 'Offer',
  Rejected: 'Rejected',
  'Role Eliminated': 'Role Eliminated',
}

export const URL_TO_STATUS: Record<string, ApplicationStatus | null> = {
  all: null,
  applied: 'Applied',
  interviewing: 'Interviewing',
  unlikely: 'Unlikely',
  offer: 'Offer',
  rejected: 'Rejected',
  'role-eliminated': 'Role Eliminated',
}
