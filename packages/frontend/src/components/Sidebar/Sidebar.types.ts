import type { HTMLAttributes } from 'react'
import type { StatusGroup } from '../../lib/statusGroup'

/**
 * The desktop app navigation (md and up). Presentational: the app shell passes the counts
 * (`useApplicationCounts`), the user (`getDisplayName`) and sign-out. Render it inside a router.
 */
export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Counts for the Jobs links; leave out while they load */
  counts?: Record<StatusGroup, number>
  user: {
    name: string
    email?: string
  }
  onSignOut: () => void
}
