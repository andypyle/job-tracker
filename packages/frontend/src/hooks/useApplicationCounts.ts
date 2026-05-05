import { useQuery } from '@tanstack/react-query'
import { getApplications } from '../lib/api'

/** Status values that constitute "rejected" for sidebar count purposes. */
const REJECTED_STATUSES = new Set(['Rejected', 'Role Eliminated'])

/**
 * Fetches all applications (no status filter) and returns counts split
 * by active vs. rejected.
 *
 * - "rejected" = status is "Rejected" OR "Role Eliminated"
 * - "active"   = everything else
 *
 * Uses queryKey ['applications', 'all'] so both the active and rejected views
 * share the same underlying cache entry, and React Query cache invalidations
 * on the ['applications'] base key will keep these counts up to date.
 */
export function useApplicationCounts(): {
  active: number
  rejected: number
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'all'],
    queryFn: () => getApplications(),
  })

  if (!data) {
    return { active: 0, rejected: 0, isLoading }
  }

  const rejected = data.filter((a) => REJECTED_STATUSES.has(a.status)).length
  const active = data.length - rejected

  return { active, rejected, isLoading }
}
