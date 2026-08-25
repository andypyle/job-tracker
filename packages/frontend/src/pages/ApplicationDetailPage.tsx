import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { STATUS_COLORS, STATUS_LABELS } from '@jobtracker/shared'
import type { StatusChange } from '@jobtracker/shared'
import { getApplication, deleteApplication } from '../lib/api'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { StatusBadge } from '../components/StatusBadge'
import { CompanyAvatar } from '../components/CompanyAvatar'
import { ApplicationModal } from '../components/ApplicationModal'

// ---------------------------------------------------------------------------
// Skeleton loader — mimics the detail layout while fetching
// ---------------------------------------------------------------------------
function DetailSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true" aria-label="Loading application details">
      {/* Back link placeholder */}
      <div className="h-4 w-28 bg-gray-200 rounded mb-6" />

      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-2">
              {/* Job title */}
              <div className="h-6 bg-gray-200 rounded w-52" />
              {/* Company */}
              <div className="h-4 bg-gray-200 rounded w-36" />
              {/* Badges row */}
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
            </div>
          </div>
          {/* Action buttons placeholder */}
          <div className="flex gap-2 shrink-0">
            <div className="h-9 w-16 bg-gray-200 rounded-lg" />
            <div className="h-9 w-16 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Fields card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-28 bg-gray-200 rounded shrink-0" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation inline UI
// ---------------------------------------------------------------------------
interface DeleteConfirmProps {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string
}

function DeleteConfirm({ onConfirm, onCancel, loading, error }: DeleteConfirmProps) {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  return (
    <div className="space-y-2">
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl px-4 py-3 text-sm"
        style={{
          background: isDark ? '#3b0f0f' : '#FEF2F2',
          border: `1px solid ${isDark ? '#7f1d1d' : '#FECACA'}`,
        }}
        role="alert"
      >
        <span className="font-medium flex-1" style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }}>
          Are you sure? This cannot be undone.
        </span>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg cursor-pointer transition-colors duration-150 disabled:opacity-50 hover:bg-gray-100"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg cursor-pointer transition-colors duration-150 disabled:opacity-60 hover:opacity-90"
            style={{ background: '#DC2626' }}
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field row — label + value pair used in the detail grid
// ---------------------------------------------------------------------------
interface FieldRowProps {
  label: string
  children: React.ReactNode
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <span
        className="text-sm font-medium shrink-0 sm:w-36"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
        {children}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Format an ISO date string to a human-readable date
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Format an ISO datetime to "Aug 25, 2026 at 2:34 PM"
// ---------------------------------------------------------------------------
function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso)
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
    return `${datePart} at ${timePart}`
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Status History Timeline
// ---------------------------------------------------------------------------

interface StatusHistoryTimelineProps {
  history: StatusChange[]
}

/**
 * Vertical timeline of status changes for an application.
 * Displays newest entries first (reverse chronological).
 * Uses STATUS_COLORS from @jobtracker/shared for status badge colors.
 * Handles the null old_status case (initial creation) with a dedicated label.
 */
function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
        No status history recorded yet.
      </p>
    )
  }

  // Sort newest-first for display
  const sorted = [...history].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
  )

  return (
    <ol className="relative" aria-label="Status history">
      {sorted.map((entry, index) => {
        const isLast = index === sorted.length - 1
        const colors = STATUS_COLORS[entry.new_status]
        const isCreation = entry.old_status === null

        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical connector line — hidden for the last item */}
            {!isLast && (
              <div
                className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              />
            )}

            {/* Timeline dot */}
            <div
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg}`}
              aria-hidden="true"
            >
              {isCreation ? (
                // Star icon for initial creation
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-3.5 h-3.5 ${colors.text}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                // Arrow icon for status transitions
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-3.5 h-3.5 ${colors.text}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {isCreation ? (
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    Application created
                  </span>
                ) : (
                  <>
                    {entry.old_status && (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {STATUS_LABELS[entry.old_status]}
                      </span>
                    )}
                    {entry.old_status && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3 h-3 shrink-0 text-gray-400"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {STATUS_LABELS[entry.new_status]}
                    </span>
                  </>
                )}
                {entry.is_automatic && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Auto
                  </span>
                )}
              </div>
              <time
                dateTime={entry.changed_at}
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {formatDateTime(entry.changed_at)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// ApplicationDetailPage
// ---------------------------------------------------------------------------
export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const {
    data: application,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id!),
    enabled: Boolean(id),
    retry: (failureCount, err) => {
      // Don't retry on 404 — the application simply doesn't exist
      if (err instanceof Error && err.message.toLowerCase().includes('404')) {
        return false
      }
      return failureCount < 2
    },
  })

  // ── Redirect to /jobs/all if data came back null/undefined ───────────────
  // (backend always returns 404 for missing apps, so this is a safety net)
  if (!isLoading && !isError && application == null) {
    navigate('/jobs/all', { replace: true })
    return null
  }

  // ── Delete handler ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteApplication(id)
      await queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.removeQueries({ queryKey: ['application', id] })
      navigate('/jobs/all', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete. Please try again.'
      setDeleteError(message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Edit success ─────────────────────────────────────────────────────────
  function handleEditSuccess() {
    queryClient.invalidateQueries({ queryKey: ['application', id] })
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    setEditOpen(false)
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    )
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (isError || !application) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {/* File search icon */}
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="12" x2="12" y2="18" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Application not found
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {error instanceof Error ? error.message : 'This application may have been deleted or does not exist.'}
          </p>
          <Link
            to="/jobs/all"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--color-primary)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  // ── Main detail view ─────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Back link */}
      <Link
        to="/jobs/all"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-150 hover:opacity-70 cursor-pointer"
        style={{ color: 'var(--color-primary)' }}
        aria-label="Back to Jobs"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back to Jobs
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: avatar + title + badges */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <CompanyAvatar
              company={application.company}
              logoUrl={application.company_logo_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-bold leading-tight truncate"
                style={{ color: 'var(--color-text)' }}
              >
                {application.job_title}
              </h1>
              <p
                className="text-lg mt-0.5 truncate"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {application.company}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={application.status} />
                {application.is_referral && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    Referral
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 cursor-pointer hover:opacity-90"
              style={{
                background: 'var(--color-primary)',
                color: 'white',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(true)
                setDeleteError('')
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity duration-150 cursor-pointer hover:opacity-90"
              style={{ backgroundColor: '#DC2626' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4">
            <DeleteConfirm
              onConfirm={handleDelete}
              onCancel={() => {
                setShowDeleteConfirm(false)
                setDeleteError('')
              }}
              loading={deleting}
              error={deleteError}
            />
          </div>
        )}
      </div>

      {/* Detail fields card */}
      <div className="bg-white rounded-2xl px-6 py-2 shadow-sm mb-4">
        {application.job_post_url && (
          <FieldRow label="Job Post URL">
            <a
              href={application.job_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150 hover:opacity-70 cursor-pointer break-all"
              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
            >
              {application.job_post_url}
            </a>
          </FieldRow>
        )}

        {application.industry && (
          <FieldRow label="Industry">{application.industry}</FieldRow>
        )}

        {application.compensation && (
          <FieldRow label="Compensation">{application.compensation}</FieldRow>
        )}

        <FieldRow label="Applied on">{formatDate(application.date_applied)}</FieldRow>

        {application.notes && (
          <FieldRow label="Notes">
            <span style={{ whiteSpace: 'pre-wrap' }}>{application.notes}</span>
          </FieldRow>
        )}

        <FieldRow label="Files">
          {application.resume_url || application.cover_letter_url ? (
            <div className="flex flex-col gap-2">
              {application.resume_url && (
                <a
                  href={application.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 hover:opacity-70 cursor-pointer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  Resume
                </a>
              )}
              {application.cover_letter_url && (
                <a
                  href={application.cover_letter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 hover:opacity-70 cursor-pointer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  Cover Letter
                </a>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>No files attached</span>
          )}
        </FieldRow>
      </div>

      {/* Status History card */}
      <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          Status History
        </h2>
        <StatusHistoryTimeline history={application.status_history ?? []} />
      </div>

      {/* Edit modal */}
      <ApplicationModal
        isOpen={editOpen}
        application={application}
        onSuccess={handleEditSuccess}
        onClose={() => setEditOpen(false)}
      />
    </div>
  )
}

export default ApplicationDetailPage
