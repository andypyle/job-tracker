import type { ApplicationStatus } from '@jobtracker/shared'

export interface StatusSelectProps {
  value: ApplicationStatus
  /**
   * Saves a new status. Return a promise (TanStack's `mutateAsync`) to show the new
   * status as busy until it settles: on success the Undo toast shows; on failure the
   * badge goes back and reporting the error is the caller's job. Undo calls this again
   * with the previous status.
   */
  onChange: (status: ApplicationStatus) => void | Promise<unknown>
  /** Names the application in the label and the toast: "Product Designer at Acme" */
  applicationName?: string
  /** Defaults to "Status", or "Status: {applicationName}" */
  'aria-label'?: string
  disabled?: boolean
  className?: string
}
