import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { URL_TO_STATUS, STATUS_LABELS } from '@jobtracker/shared'
import { getApplications } from '../lib/api'
import { ApplicationCard } from '../components/ApplicationCard'
import { ApplicationModal } from '../components/ApplicationModal'

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
  const status = URL_TO_STATUS[statusParam]
  return status ? STATUS_LABELS[status] : 'Applications'
}

// ---------------------------------------------------------------------------
// JobsPage
// ---------------------------------------------------------------------------

export function JobsPage() {
  const { status: statusParam = 'all' } = useParams<{ status: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Resolve the URL param to an ApplicationStatus or undefined (no filter).
  // URL_TO_STATUS returns null for 'all' meaning "no filter".
  const statusFilter =
    statusParam in URL_TO_STATUS ? URL_TO_STATUS[statusParam] ?? undefined : undefined

  const {
    data: applications,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['applications', statusParam],
    queryFn: () => getApplications(statusFilter),
  })

  const pageTitle = getPageTitle(statusParam)
  const isAllFilter = statusParam === 'all'

  const filteredApplications = applications
    ? search.trim()
      ? applications.filter((a) =>
          a.company.toLowerCase().includes(search.trim().toLowerCase()) ||
          a.job_title.toLowerCase().includes(search.trim().toLowerCase())
        )
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
          )}
        </>
      )}

      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['applications', statusParam] })
          queryClient.invalidateQueries({ queryKey: ['applications'] })
        }}
      />
    </div>
  )
}
