import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { STATUS_LABELS, type Application, type ApplicationStatus } from '@jobtracker/shared'
import { Alert } from '../components/Alert/Alert'
import { ApplicationCard, ApplicationCardSkeleton } from '../components/ApplicationCard/ApplicationCard'
import { Button } from '../components/Button/Button'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Input } from '../components/Input/Input'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { updateApplication } from '../lib/api'
import { plural } from '../lib/dashboard'
import { matchesSearch } from '../lib/jobsList'
import { toast } from '../lib/toast'

/** Saves a new status; return a promise to show the badge busy until it settles */
export type StatusChangeHandler = (application: Application, status: ApplicationStatus) => void | Promise<unknown>

export interface JobsListScreenProps {
  title: string
  description?: string
  /** The list's name in the no-match message ("Nothing in Unlikely matches …") */
  listName: string
  /** This list's applications, in display order; undefined while loading */
  applications: Application[] | undefined
  error?: boolean
  /** Replaces the search and rows when the list is empty */
  empty: ReactNode
  /** Show "Add application" in the header from md (off when the empty state has the button) */
  headerAction?: boolean
  onAddApplication: () => void
  /** Renders the rows that match the search; `entered` holds the ids that arrived since the last render */
  children: (matches: Application[], entered: ReadonlySet<string>) => ReactNode
}

/** The Jobs lists' layout: header, search, rows, and the loading, error, empty and no-match states */
export function JobsListScreen({
  title,
  description,
  listName,
  applications,
  error = false,
  empty,
  headerAction = true,
  onAddApplication,
  children,
}: JobsListScreenProps) {
  // Below md the Bottom bar has "Add application", so the header has no actions (as in Figma)
  const desktop = useMediaQuery('(min-width: 48rem)')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const entered = useEnteredRows(applications)
  const matches = applications?.filter((a) => matchesSearch(a, query))
  const searching = query.trim() !== ''

  let content: ReactNode
  if (error) {
    content = <Alert tone="danger">We couldn’t load your applications. Refresh the page to try again.</Alert>
  } else if (applications?.length === 0) {
    content = empty
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
          // Figma: Screens › Jobs: Active, no matches
          <EmptyState
            className="py-12"
            titleAs="h2"
            title="No matches"
            description={`Nothing in ${listName} matches “${query.trim()}”. Check the spelling or try the company name.`}
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
          children(matches, entered)
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          desktop && headerAction && !error ? (
            <Button variant="primary" icon="plus" onClick={onAddApplication}>
              Add application
            </Button>
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:px-10 md:pt-8 md:pb-12">{content}</div>
    </>
  )
}

export interface ApplicationRowsProps extends ComponentPropsWithoutRef<'ul'> {
  applications: Application[]
  entered: ReadonlySet<string>
  onStatusChange: StatusChangeHandler
}

/** A `<ul>` of ApplicationCards; rows in `entered` rise in */
export function ApplicationRows({ applications, entered, onStatusChange, ...props }: ApplicationRowsProps) {
  return (
    <ul className="flex flex-col gap-3" {...props}>
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          enter={entered.has(application.id)}
          onStatusChange={(status) => onStatusChange(application, status)}
        />
      ))}
    </ul>
  )
}

/**
 * The ids of rows that arrived since the last render: new applications, and ones whose status
 * changed (they rise in where they land, e.g. after a move between groups or an Undo). Nothing
 * enters on the first render with data.
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

/**
 * Saves a status change from a Jobs list or Application detail. It settles once the lists and
 * the application have refetched, so the row moves (or the history grows) as StatusSelect's
 * toast appears; a failure shows a danger toast.
 */
export function useStatusChange(): StatusChangeHandler {
  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => updateApplication(id, { status }),
    onSuccess: (_, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
        queryClient.invalidateQueries({ queryKey: ['application', id] }),
        queryClient.invalidateQueries({ queryKey: ['timeline-stats'] }),
      ]),
    onError: (error, { status }) =>
      toast({
        tone: 'danger',
        title: `Couldn’t move it to ${STATUS_LABELS[status]}`,
        message: error instanceof Error ? error.message : undefined,
      }),
  })
  return (application, status) => mutateAsync({ id: application.id, status })
}
