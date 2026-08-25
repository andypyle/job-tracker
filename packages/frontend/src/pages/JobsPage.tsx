import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { URL_TO_STATUS, STATUS_LABELS } from '@jobtracker/shared'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { getApplications } from '../lib/api'
import { ApplicationCard } from '../components/ApplicationCard'
import { ApplicationModal } from '../components/ApplicationModal'

// ---------------------------------------------------------------------------
// Multi-status filter config for "active" and "rejected" aggregate views.
// The backend only accepts a single status value, so these views fetch all
// applications and filter client-side.
// ---------------------------------------------------------------------------

/** Statuses that fall into the "rejected" aggregate view. */
const REJECTED_STATUSES = new Set<ApplicationStatus>(['Rejected', 'Role Eliminated'])

/**
 * Returns true when a URL status param requires a client-side multi-status
 * filter (i.e., it cannot be handled by a single backend status param).
 */
function isAggregateParam(param: string): param is 'active' | 'rejected' {
  return param === 'active' || param === 'rejected'
}

/**
 * Apply the client-side filter for aggregate views.
 * - 'active':   exclude Rejected and Role Eliminated
 * - 'rejected': include only Rejected and Role Eliminated
 */
function applyAggregateFilter(
  apps: Application[],
  param: 'active' | 'rejected',
): Application[] {
  if (param === 'rejected') {
    return apps.filter((a) => REJECTED_STATUSES.has(a.status))
  }
  // active
  return apps.filter((a) => !REJECTED_STATUSES.has(a.status))
}

// ---------------------------------------------------------------------------
// Skeleton loader — 3 placeholder cards shown while fetching
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 animate-pulse"
      aria-hidden="true"
    >
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      {/* Text lines */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/5" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-3 bg-gray-200 rounded w-1/6" />
      </div>
      {/* Badge placeholder */}
      <div className="h-5 w-20 bg-gray-200 rounded-full shrink-0" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
interface EmptyStateProps {
  isAllFilter: boolean
  onAddClick: () => void
}

function EmptyState({ isAllFilter, onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Briefcase icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-12 h-12 text-gray-300 mb-4"
        aria-hidden="true"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
      <p
        className="text-base font-semibold mb-1"
        style={{ color: 'var(--color-text)' }}
      >
        {isAllFilter ? 'No applications yet' : 'No applications match this filter'}
      </p>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        {isAllFilter
          ? 'Start tracking your job search by adding your first application.'
          : 'Try a different status filter or add a new application.'}
      </p>
      {isAllFilter && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {/* Plus icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Application
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page title label helpers
// ---------------------------------------------------------------------------

/** Maps a URL param slug to a human-readable page heading. */
function getPageTitle(statusParam: string): string {
  if (statusParam === 'all') return 'All Applications'
  if (statusParam === 'active') return 'Active Applications'
  if (statusParam === 'rejected') return 'Rejected'
  const status = URL_TO_STATUS[statusParam]
  return status ? STATUS_LABELS[status] : 'Applications'
}

// ---------------------------------------------------------------------------
// Currently Interviewing section
// ---------------------------------------------------------------------------

interface InterviewingSpotlightProps {
  applications: Application[]
  onCardClick: (id: string) => void
}

/**
 * Renders a highlighted section at the top of the list showing all
 * applications currently in the "Interviewing" status. Uses the amber
 * status color from STATUS_COLORS for a subtle visual distinction.
 *
 * Only renders when there is at least one interviewing application.
 */
function InterviewingSpotlight({ applications, onCardClick }: InterviewingSpotlightProps) {
  const interviewing = applications.filter((a) => a.status === 'Interviewing')

  if (interviewing.length === 0) return null

  return (
    <section
      aria-label="Currently Interviewing"
      className="mb-6 rounded-2xl border border-sage-200 bg-sage-50 overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, #87a878 12%, transparent)',
        borderColor: 'color-mix(in srgb, #87a878 30%, transparent)',
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b"
        style={{ borderColor: 'color-mix(in srgb, #87a878 30%, transparent)' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 shrink-0"
          style={{ color: '#5a7a4a' }}
          aria-hidden="true"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <h2 className="text-sm font-semibold" style={{ color: '#5a7a4a' }}>
          Currently Interviewing
        </h2>
        <span
          className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: 'color-mix(in srgb, #87a878 35%, transparent)', color: '#3d5c2e' }}
        >
          {interviewing.length}
        </span>
      </div>

      {/* Application cards */}
      <ul className="p-3 space-y-2.5" role="list">
        {interviewing.map((app) => (
          <li key={app.id} className="rounded-r-2xl overflow-hidden" style={{ borderLeft: '4px solid #87a878' }}>
            <ApplicationCard
              application={app}
              onClick={() => onCardClick(app.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// JobsPage
// ---------------------------------------------------------------------------

export function JobsPage() {
  const { status: statusParam = 'active' } = useParams<{ status: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Determine whether this view uses a single-status backend filter or a
  // client-side aggregate filter (active / rejected).
  const isAggregate = isAggregateParam(statusParam)

  // For aggregate views: fetch all and filter client-side; share the cache
  // entry ['applications', 'all'] with the counts hook so the sidebar stays
  // in sync without a separate network request.
  // For single-status views: filter on the backend as before.
  const statusFilter =
    !isAggregate && statusParam in URL_TO_STATUS
      ? (URL_TO_STATUS[statusParam] ?? undefined)
      : undefined

  const queryKey = isAggregate
    ? (['applications', 'all'] as const)
    : (['applications', statusParam] as const)

  const {
    data: rawApplications,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => getApplications(statusFilter),
  })

  // Apply client-side aggregate filter when needed
  const applications = isAggregate && rawApplications
    ? applyAggregateFilter(rawApplications, statusParam)
    : rawApplications

  const pageTitle = getPageTitle(statusParam)
  // Empty-state CTA prompt is only shown for the all/active views (not rejected)
  const isAllFilter = statusParam === 'all' || statusParam === 'active'

  // Show the interviewing spotlight only on views where interviewing apps
  // are visible: the "all" view, the "active" aggregate view, and when no
  // search filter is active (to avoid confusing duplication with search results).
  const showInterviewingSpotlight =
    !search.trim() &&
    (statusParam === 'all' || statusParam === 'active') &&
    applications != null &&
    applications.some((a) => a.status === 'Interviewing')

  const filteredApplications = applications
    ? search.trim()
      ? applications.filter((a) =>
          a.company.toLowerCase().includes(search.trim().toLowerCase()) ||
          a.job_title.toLowerCase().includes(search.trim().toLowerCase())
        )
      : showInterviewingSpotlight
        ? applications.filter((a) => a.status !== 'Interviewing')
        : applications
    : []

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            {pageTitle}
          </h1>
          {!isLoading && !isError && applications && (
            <p className="text-sm text-gray-400 mt-0.5">
              {filteredApplications.length}{search.trim() ? ` of ${applications.length}` : ''} application{filteredApplications.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Application
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          placeholder="Search by company or job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          Failed to load applications:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {/* Loading state: skeleton cards */}
      {isLoading && (
        <div className="space-y-3" aria-label="Loading applications">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Loaded: empty state or application list */}
      {!isLoading && !isError && applications && (
        <>
          {applications.length === 0 ? (
            <EmptyState
              isAllFilter={isAllFilter}
              onAddClick={() => setModalOpen(true)}
            />
          ) : filteredApplications.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">
              No applications match "{search}"
            </p>
          ) : (
            <>
              {/* Currently Interviewing spotlight — only on all/active, no search */}
              {showInterviewingSpotlight && (
                <InterviewingSpotlight
                  applications={applications}
                  onCardClick={(id) => navigate(`/jobs/detail/${id}`)}
                />
              )}

              <ul className="space-y-3" role="list" aria-label={pageTitle}>
                {filteredApplications.map((app) => (
                  <li key={app.id}>
                    <ApplicationCard
                      application={app}
                      onClick={() => navigate(`/jobs/detail/${app.id}`)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          // Invalidate both the shared 'all' cache and any single-status cache
          queryClient.invalidateQueries({ queryKey: ['applications'] })
        }}
      />
    </div>
  )
}
