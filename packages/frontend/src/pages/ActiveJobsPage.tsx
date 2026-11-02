import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { STATUS_LABELS, type Application, type ApplicationStatus } from '@jobtracker/shared'
import { Alert } from '../components/Alert/Alert'
import { ApplicationCard, ApplicationCardSkeleton } from '../components/ApplicationCard/ApplicationCard'
import { Badge } from '../components/Badge/Badge'
import { Button } from '../components/Button/Button'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Input } from '../components/Input/Input'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getApplications, updateApplication } from '../lib/api'
import { plural } from '../lib/dashboard'
import { activeGroups, describeActive, matchesSearch, newestFirst } from '../lib/jobsList'
import { statusGroup } from '../lib/statusGroup'
import { toast } from '../lib/toast'
import { useAddApplication } from './AppLayout'

export interface ActiveJobsScreenProps {
  /** Every application (the screen keeps the active ones); undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  /** Saves a new status; return a promise to show the badge busy until it settles */
  onStatusChange: (application: Application, status: ApplicationStatus) => void | Promise<unknown>
  onAddApplication: () => void
}

/** Jobs: Active, without data fetching */
export function ActiveJobsScreen({ applications, error = false, onStatusChange, onAddApplication }: ActiveJobsScreenProps) {
  // Below md the Bottom bar has "Add application", so the header has no actions (as in Figma)
  const desktop = useMediaQuery('(min-width: 48rem)')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const active = applications?.filter((a) => statusGroup(a.status) === 'active')
  const entered = useEnteredRows(active)
  const empty = active?.length === 0
  const matches = active?.filter((a) => matchesSearch(a, query)).sort(newestFirst)
  const searching = query.trim() !== ''

  const addButton = (
    <Button variant="primary" icon="plus" onClick={onAddApplication}>
      Add application
    </Button>
  )

  let description: string | undefined
  if (active && !error) description = empty ? 'Nothing tracked yet' : describeActive(active)

  let content: ReactNode
  if (error) {
    content = <Alert tone="danger">We couldn’t load your applications. Refresh the page to try again.</Alert>
  } else if (empty) {
    content =
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
  } else {
    content = (
      <>
        <Input
          type="search"
          leadingIcon="search"
          aria-label="Search applications"
          placeholder={desktop ? 'Search by title or company' : 'Search'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          ref={searchRef}
          disabled={!matches}
        />
        {/* Announces how many rows a search leaves; quiet while the query is empty */}
        <p aria-live="polite" className="sr-only">
          {searching && matches ? `${plural(matches.length, 'matching application')}` : ''}
        </p>
        {!matches ? (
          <ul aria-busy="true" aria-label="Loading applications" className="flex flex-col gap-3">
            <ApplicationCardSkeleton />
            <ApplicationCardSkeleton />
            <ApplicationCardSkeleton />
          </ul>
        ) : matches.length === 0 ? (
          // Not designed in Figma
          <EmptyState
            className="py-12"
            titleAs="h2"
            title="No matches"
            description={`Nothing in Active matches “${query.trim()}”. Check the spelling or try the company name.`}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          activeGroups.map(({ status, label }) => (
            <StatusGroup
              key={status}
              label={label}
              applications={matches.filter((a) => a.status === status)}
              entered={entered}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Active applications"
        description={description}
        actions={desktop && !empty && !error ? addButton : undefined}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:px-10 md:pt-8 md:pb-12">{content}</div>
    </>
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
  onStatusChange: ActiveJobsScreenProps['onStatusChange']
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
      <ul className="flex flex-col gap-3">
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            enter={entered.has(application.id)}
            onStatusChange={(status) => onStatusChange(application, status)}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * The ids of rows that arrived in their group since the last render: new applications, and
 * ones whose status moved them between groups (they rise in where they land). Nothing enters
 * on the first render with data.
 */
function useEnteredRows(applications: Application[] | undefined): ReadonlySet<string> {
  const seen = useRef<Map<string, ApplicationStatus> | null>(null)
  const entered = new Set<string>()
  if (seen.current && applications) {
    for (const { id, status } of applications) {
      if (seen.current.get(id) !== status) entered.add(id)
    }
  }

  useEffect(() => {
    if (applications) seen.current = new Map(applications.map((a) => [a.id, a.status]))
  }, [applications])

  return entered
}

/** The `/jobs/active` route: the screen wired to the API */
export function ActiveJobsPage() {
  const queryClient = useQueryClient()
  const openAddApplication = useAddApplication()
  // Shares its cache with the navigation counts
  const applications = useQuery({ queryKey: ['applications', 'all'], queryFn: () => getApplications() })
  const statusChange = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => updateApplication(id, { status }),
    // Settles once the lists have refetched, so the row moves as the toast appears
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['timeline-stats'] }),
      ]),
    onError: (error, { status }) =>
      toast({
        tone: 'danger',
        title: `Couldn’t move it to ${STATUS_LABELS[status]}`,
        message: error instanceof Error ? error.message : undefined,
      }),
  })

  return (
    <ActiveJobsScreen
      applications={applications.data}
      error={applications.isError}
      onStatusChange={(application, status) => statusChange.mutateAsync({ id: application.id, status })}
      onAddApplication={openAddApplication}
    />
  )
}
