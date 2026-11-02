import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Application } from '@jobtracker/shared'
import { Badge } from '../components/Badge/Badge'
import { Button } from '../components/Button/Button'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { getApplications } from '../lib/api'
import { activeGroups, describeActive, newestFirst } from '../lib/jobsList'
import { statusGroup } from '../lib/statusGroup'
import { useAddApplication } from './AppLayout'
import { ApplicationRows, JobsListScreen, useStatusChange, type StatusChangeHandler } from './JobsListScreen'

export interface ActiveJobsScreenProps {
  /** Every application (the screen keeps the active ones); undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  onStatusChange: StatusChangeHandler
  onAddApplication: () => void
}

/** Jobs: Active, without data fetching */
export function ActiveJobsScreen({ applications, error = false, onStatusChange, onAddApplication }: ActiveJobsScreenProps) {
  const active = applications?.filter((a) => statusGroup(a.status) === 'active').sort(newestFirst)
  const empty = active?.length === 0

  const addButton = (
    <Button variant="primary" icon="plus" onClick={onAddApplication}>
      Add application
    </Button>
  )

  let description: string | undefined
  if (active && !error) description = empty ? 'Nothing tracked yet' : describeActive(active)

  return (
    <JobsListScreen
      title="Active applications"
      description={description}
      listName="Active"
      applications={active}
      error={error}
      headerAction={!empty}
      onAddApplication={onAddApplication}
      empty={
        applications?.length === 0 ? (
          <EmptyState
            className="my-auto py-12"
            title="Add your first application"
            description="Paste a job link and we’ll fill in the title, company and logo. Everything else is optional."
            action={addButton}
          />
        ) : (
          // Not designed: everything tracked has moved on to Unlikely or Rejected
          <EmptyState
            className="my-auto py-12"
            title="No active applications"
            description="Everything you’ve tracked is in Unlikely or Rejected. Add an application to keep going."
            action={addButton}
          />
        )
      }
    >
      {(matches, entered) =>
        activeGroups.map(({ status, label }) => (
          <StatusGroup
            key={status}
            label={label}
            applications={matches.filter((a) => a.status === status)}
            entered={entered}
            onStatusChange={onStatusChange}
          />
        ))
      }
    </JobsListScreen>
  )
}

function StatusGroup({
  label,
  applications,
  entered,
  onStatusChange,
}: {
  label: string
  applications: Application[]
  entered: ReadonlySet<string>
  onStatusChange: StatusChangeHandler
}) {
  const headingId = useId()
  if (applications.length === 0) return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 id={headingId} className="font-display text-heading-h3">
          {label}
        </h2>
        <Badge tone="neutral" appearance="soft" size="small">
          {applications.length}
        </Badge>
      </div>
      <ApplicationRows applications={applications} entered={entered} onStatusChange={onStatusChange} />
    </section>
  )
}

/** The `/jobs/active` route: the screen wired to the API */
export function ActiveJobsPage() {
  const openAddApplication = useAddApplication()
  // Shares its cache with the navigation counts
  const applications = useQuery({ queryKey: ['applications', 'all'], queryFn: () => getApplications() })
  const onStatusChange = useStatusChange()

  return (
    <ActiveJobsScreen
      applications={applications.data}
      error={applications.isError}
      onStatusChange={onStatusChange}
      onAddApplication={openAddApplication}
    />
  )
}
