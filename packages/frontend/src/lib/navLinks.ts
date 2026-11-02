import type { IconName } from '../components/Icon/Icon.paths'
import type { StatusGroup } from './statusGroup'

export interface JobsLink {
  to: string
  icon: IconName
  label: string
  /** Which count from `useApplicationCounts` the link shows */
  group: StatusGroup
}

/** The Jobs section of the main navigation, shared by Sidebar and MobileNav */
export const jobsLinks: readonly JobsLink[] = [
  { to: '/jobs/active', icon: 'briefcase', label: 'Active', group: 'active' },
  { to: '/jobs/unlikely', icon: 'clock', label: 'Unlikely', group: 'unlikely' },
  { to: '/jobs/rejected', icon: 'ban', label: 'Rejected', group: 'rejected' },
]
