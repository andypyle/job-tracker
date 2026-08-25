import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { STATUS_LABELS } from '@jobtracker/shared'
import { updateApplication } from '../lib/api'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { CompanyAvatar } from './CompanyAvatar'

interface ApplicationCardProps {
  application: Application
  onClick: () => void
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Unlikely',
  'Role Eliminated',
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const {
    id,
    job_title,
    company,
    company_logo_url,
    date_applied,
    status,
    is_referral,
    compensation,
  } = application

  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState(false)
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const newStatus = e.target.value as ApplicationStatus
    if (newStatus === status) return
    setUpdating(true)
    try {
      await updateApplication(id, { status: newStatus })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <article
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex items-center gap-4"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`${job_title} at ${company}`}
    >
      {/* Company avatar */}
      <CompanyAvatar company={company} logoUrl={company_logo_url} size="md" />

      {/* Center: title, company, date, compensation */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {job_title}
        </p>
        <p className="text-sm text-gray-500 truncate">{company}</p>
        {compensation && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{compensation}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(date_applied)}</p>
      </div>

      {/* Right: status dropdown + referral chip */}
      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-flex items-center">
          <select
            value={status}
            onChange={handleStatusChange}
            disabled={updating}
            aria-label={`Status for ${job_title}`}
            className="appearance-none text-xs font-medium rounded-full pl-3 pr-7 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
            style={{
              backgroundColor: getStatusBg(status, isDark),
              color: getStatusText(status, isDark),
            }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-2.5 w-3 h-3"
            style={{ color: getStatusText(status, isDark) }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {is_referral && (
          <span className="bg-purple-100 text-purple-700 text-xs rounded-full px-2 py-0.5 font-medium">
            Referral
          </span>
        )}
      </div>
    </article>
  )
}

// Map status to the same Tailwind colors used in StatusBadge, but as inline styles
// so the select element can inherit them (Tailwind classes don't apply to option elements).
const STATUS_BG:      Record<ApplicationStatus, string> = { Applied:'#DBEAFE', Interviewing:'#e4ede0', Unlikely:'#F3F4F6', Offer:'#D1FAE5', Rejected:'#FEE2E2', 'Role Eliminated':'#F1F5F9' }
const STATUS_TEXT:    Record<ApplicationStatus, string> = { Applied:'#1D4ED8', Interviewing:'#4a6940', Unlikely:'#6B7280', Offer:'#047857', Rejected:'#DC2626', 'Role Eliminated':'#475569' }
const STATUS_BG_DARK: Record<ApplicationStatus, string> = { Applied:'#1e3a5f', Interviewing:'#1c2e18', Unlikely:'#1f2937', Offer:'#0d3321', Rejected:'#3b0f0f', 'Role Eliminated':'#1e293b' }
const STATUS_TEXT_DARK:Record<ApplicationStatus,string> = { Applied:'#93C5FD', Interviewing:'#9dc48a', Unlikely:'#9CA3AF', Offer:'#6EE7B7', Rejected:'#FCA5A5', 'Role Eliminated':'#94A3B8' }

function getStatusBg(s: ApplicationStatus, dark: boolean)   { return (dark ? STATUS_BG_DARK : STATUS_BG)[s]   ?? '#F3F4F6' }
function getStatusText(s: ApplicationStatus, dark: boolean) { return (dark ? STATUS_TEXT_DARK : STATUS_TEXT)[s] ?? '#6B7280' }
