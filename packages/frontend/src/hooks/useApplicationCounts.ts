import { useQuery } from '@tanstack/react-query'
import { getApplications } from '../lib/api'
import { statusGroup, type StatusGroup } from '../lib/statusGroup'

/**
 * Fetches all applications (no status filter) and counts them by Jobs list:
 * active (Applied, Interviewing, Offer), unlikely, and rejected (Rejected
 * and Role Eliminated). See `statusGroup`.
 *
 * Uses queryKey ['applications', 'all'] so every view shares the same cache
 * entry, and invalidations on the ['applications'] base key keep the counts
 * up to date.
 */
export function useApplicationCounts(): Record<StatusGroup, number> & {
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'all'],
    queryFn: () => getApplications(),
  })

  const counts: Record<StatusGroup, number> = { active: 0, unlikely: 0, rejected: 0 }
  for (const application of data ?? []) {
    counts[statusGroup(application.status)] += 1
  }

  return { ...counts, isLoading }
}
