import type { StatusGroup } from '../../lib/statusGroup'

/**
 * The navigation below md: a trigger in the bottom-left corner that opens a panel above it.
 * Presentational, like Sidebar: the app shell passes the counts, the user and sign-out. Render it
 * inside a router.
 */
export interface MobileNavProps {
  /** Counts for the Jobs links; leave out while they load */
  counts?: Record<StatusGroup, number>
  user: {
    name: string
    email?: string
  }
  onSignOut: () => void
  /**
   * Fixed 16px from the left and bottom edges (plus the safe area), with shadow/overlay. Turn it
   * off when the trigger sits in the Bottom bar; the panel opens above the trigger either way.
   * Defaults to true.
   */
  floating?: boolean
  /** Applies to the trigger */
  className?: string
}
