import { useQuery } from '@tanstack/react-query'
import type { Application } from '@jobtracker/shared'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { getApplications } from '../lib/api'
import { newestFirst } from '../lib/jobsList'
import { statusGroup } from '../lib/statusGroup'
import { useAddApplication } from './AppLayout'
import { ApplicationRows, JobsListScreen, useStatusChange, type StatusChangeHandler } from './JobsListScreen'

export interface RejectedJobsScreenProps {
  /** Every application (the screen keeps Rejected and Role Eliminated); undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  onStatusChange: StatusChangeHandler
  onAddApplication: () => void
}

/** Jobs: Rejected, without data fetching: the Unlikely layout, newest first */
export function RejectedJobsScreen({ applications, error = false, onStatusChange, onAddApplication }: RejectedJobsScreenProps) {
  const rejected = applications?.filter((a) => statusGroup(a.status) === 'rejected').sort(newestFirst)

  return (
    <JobsListScreen
      title="Rejected"
      // Not designed in Figma
      description="Rejections and eliminated roles. Change a status if one comes back."
      listName="Rejected"
      applications={rejected}
      error={error}
      onAddApplication={onAddApplication}
      empty={
        <EmptyState
          className="my-auto py-12"
          title="No rejections"
          description="Applications you mark Rejected or Role Eliminated show up here."
        />
      }
    >
      {(matches, entered) => (
        <ApplicationRows
          aria-label="Rejected applications"
          applications={matches}
          entered={entered}
          onStatusChange={onStatusChange}
        />
      )}
    </JobsListScreen>
  )
}

/** The `/jobs/rejected` route: the screen wired to the API */
export function RejectedJobsPage() {
  const openAddApplication = useAddApplication()
  // Shares its cache with the navigation counts
  const applications = useQuery({ queryKey: ['applications', 'all'], queryFn: () => getApplications() })
  const onStatusChange = useStatusChange()

  return (
    <RejectedJobsScreen
      applications={applications.data}
      error={applications.isError}
      onStatusChange={onStatusChange}
      onAddApplication={openAddApplication}
    />
  )
}
