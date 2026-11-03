import { UNLIKELY_AFTER_DAYS_OPTIONS, type UnlikelyAfterDays } from '@jobtracker/shared'
import type { SelectOption } from '../components/Select/Select.types'

/** Select values are strings: the day counts, and `never` for null */
export type UnlikelyAfterValue = `${UnlikelyAfterDays}` | 'never'

/** The "Move to Unlikely after" choices, shortest first, then Never */
export const unlikelyAfterOptions: readonly SelectOption<UnlikelyAfterValue>[] = [
  ...UNLIKELY_AFTER_DAYS_OPTIONS.map((days) => ({ value: `${days}` as const, label: `${days} days` })),
  { value: 'never', label: 'Never' },
]

export function toUnlikelyAfterValue(days: UnlikelyAfterDays | null): UnlikelyAfterValue {
  return days === null ? 'never' : `${days}`
}

export function fromUnlikelyAfterValue(value: UnlikelyAfterValue): UnlikelyAfterDays | null {
  return value === 'never' ? null : (Number(value) as UnlikelyAfterDays)
}

/** What the saved setting means, for the confirmation toast */
export function describeUnlikelyAfter(days: UnlikelyAfterDays | null): string {
  return days === null
    ? 'Applications stay in Applied until you move them.'
    : `Applications move to Unlikely after ${days} days in Applied.`
}

/**
 * The Unlikely list's description and empty-state text for the user's cutoff. Undefined (still
 * loading) gets wording that's true either way.
 */
export function unlikelyListCopy(days: UnlikelyAfterDays | null | undefined): { description: string; empty: string } {
  if (days === null) {
    return {
      description: 'The automatic move is off. Change a status to move one back.',
      empty: 'The automatic move to Unlikely is off. You can turn it on in Settings.',
    }
  }
  if (days === undefined) {
    return {
      description: 'No recent status change. Change a status to move it back.',
      empty: 'Applications move here after a while in Applied with no status change.',
    }
  }
  return {
    description: `No status change in ${days} days. Change a status to move it back.`,
    empty: `Applications move here after ${days} days in Applied with no status change.`,
  }
}
