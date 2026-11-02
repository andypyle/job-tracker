import { useQuery } from '@tanstack/react-query'
import type { Application } from '@jobtracker/shared'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { getApplications } from '../lib/api'
import { newestFirst } from '../lib/jobsList'
import { statusGroup } from '../lib/statusGroup'
import { useAddApplication } from './AppLayout'
import { ApplicationRows, JobsListScreen, useStatusChange, type StatusChangeHandler } from './JobsListScreen'

export interface UnlikelyJobsScreenProps {
  /** Every application (the screen keeps the Unlikely ones); undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  onStatusChange: StatusChangeHandler
  onAddApplication: () => void
}

/**
 * Jobs: Unlikely, without data fetching: one list, newest first, since the ones that only just
 * went quiet are the likeliest to come back (Figma's frame shows oldest first)
 */
export function UnlikelyJobsScreen({ applications, error = false, onStatusChange, onAddApplication }: UnlikelyJobsScreenProps) {
  const unlikely = applications?.filter((a) => statusGroup(a.status) === 'unlikely').sort(newestFirst)

  return (
    <JobsListScreen
      title="Unlikely"
      description="No status change in 2 weeks. Change a status to move it back."
      listName="Unlikely"
      applications={unlikely}
      error={error}
      onAddApplication={onAddApplication}
      empty={
        // Figma: Screens › Jobs: Unlikely, empty
        <EmptyState
          className="my-auto py-12"
          title="Nothing unlikely"
          description="Applications move here after 2 weeks in Applied with no status change."
        />
      }
    >
      {(matches, entered) => (
        <ApplicationRows
          aria-label="Unlikely applications"
          applications={matches}
          entered={entered}
          onStatusChange={onStatusChange}
        />
      )}
    </JobsListScreen>
  )
}

/** The `/jobs/unlikely` route: the screen wired to the API */
export function UnlikelyJobsPage() {
  const openAddApplication = useAddApplication()
  // Shares its cache with the navigation counts
  const applications = useQuery({ queryKey: ['applications', 'all'], queryFn: () => getApplications() })
  const onStatusChange = useStatusChange()

  return (
    <UnlikelyJobsScreen
      applications={applications.data}
      error={applications.isError}
      onStatusChange={onStatusChange}
      onAddApplication={openAddApplication}
    />
  )
}
