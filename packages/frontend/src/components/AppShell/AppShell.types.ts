import type { ReactNode } from 'react'
import type { SidebarProps } from '../Sidebar/Sidebar.types'

/**
 * The signed-in frame: Sidebar from md; MobileTopBar, MobileNav and the Bottom bar below md.
 * Presentational, like Sidebar: the app layout passes the counts, the user and sign-out. Render
 * it inside a router.
 */
export interface AppShellProps {
  /** Counts for the Jobs links; leave out while they load */
  counts?: SidebarProps['counts']
  user: SidebarProps['user']
  onSignOut: () => void
  /**
   * Shows the Bottom bar below md, with the MobileNav trigger and a full-width "Add
   * application" button that calls this. Without it the trigger floats (Application detail).
   */
  onAddApplication?: () => void
  /** The page, inside `<main>` */
  children: ReactNode
  className?: string
}
