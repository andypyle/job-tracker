import type { ApplicationStatus } from '@jobtracker/shared'

/** The Jobs lists: Active, Unlikely and Rejected (which includes Role Eliminated). */
export type StatusGroup = 'active' | 'unlikely' | 'rejected'

const groups: Record<ApplicationStatus, StatusGroup> = {
  Applied: 'active',
  Interviewing: 'active',
  Offer: 'active',
  Unlikely: 'unlikely',
  Rejected: 'rejected',
  'Role Eliminated': 'rejected',
}

export function statusGroup(status: ApplicationStatus): StatusGroup {
  return groups[status]
}
