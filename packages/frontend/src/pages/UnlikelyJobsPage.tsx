import { useQuery } from '@tanstack/react-query'
import type { Application, UnlikelyAfterDays } from '@jobtracker/shared'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { getApplications, getSettings } from '../lib/api'
import { newestFirst } from '../lib/jobsList'
import { unlikelyListCopy } from '../lib/settings'
import { statusGroup } from '../lib/statusGroup'
import { useAddApplication } from './AppLayout'
import { ApplicationRows, JobsListScreen, useStatusChange, type StatusChangeHandler } from './JobsListScreen'

export interface UnlikelyJobsScreenProps {
  /** Every application (the screen keeps the Unlikely ones); undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  /** The user's cutoff, for the copy: null when the move is off, undefined while loading */
  unlikelyAfterDays?: UnlikelyAfterDays | null
  onStatusChange: StatusChangeHandler
  onAddApplication: () => void
}

/**
 * Jobs: Unlikely, without data fetching: one list, newest first, since the ones that only just
 * went quiet are the likeliest to come back (Figma's frame shows oldest first)
 */
export function UnlikelyJobsScreen({
  applications,
  error = false,
  unlikelyAfterDays,
  onStatusChange,
  onAddApplication,
}: UnlikelyJobsScreenProps) {
  const copy = unlikelyListCopy(unlikelyAfterDays)
  const unlikely = applications?.filter((a) => statusGroup(a.status) === 'unlikely').sort(newestFirst)

  return (
    <JobsListScreen
      title="Unlikely"
      description={copy.description}
      listName="Unlikely"
      applications={unlikely}
      error={error}
      onAddApplication={onAddApplication}
      empty={
        // Figma: Screens › Jobs: Unlikely, empty
        <EmptyState
          className="my-auto py-12"
          title="Nothing unlikely"
          description={copy.empty}
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
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const onStatusChange = useStatusChange()

  return (
    <UnlikelyJobsScreen
      applications={applications.data}
      error={applications.isError}
      unlikelyAfterDays={settings.data?.unlikely_after_days}
      onStatusChange={onStatusChange}
      onAddApplication={openAddApplication}
    />
  )
}
