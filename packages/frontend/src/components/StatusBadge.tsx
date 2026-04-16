import { useMediaQuery } from '../hooks/useMediaQuery'
import type { ApplicationStatus } from '@jobtracker/shared'

interface StatusBadgeProps {
  status: ApplicationStatus
}

const BADGE_COLORS: Record<ApplicationStatus, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Applied:          { bg: '#DBEAFE', text: '#1D4ED8', darkBg: '#1e3a5f', darkText: '#93C5FD' },
  Interviewing:     { bg: '#FEF3C7', text: '#B45309', darkBg: '#3d2a0a', darkText: '#FCD34D' },
  Unlikely:         { bg: '#F3F4F6', text: '#6B7280', darkBg: '#1f2937', darkText: '#9CA3AF' },
  Offer:            { bg: '#D1FAE5', text: '#047857', darkBg: '#0d3321', darkText: '#6EE7B7' },
  Rejected:         { bg: '#FEE2E2', text: '#DC2626', darkBg: '#3b0f0f', darkText: '#FCA5A5' },
  'Role Eliminated':{ bg: '#F1F5F9', text: '#475569', darkBg: '#1e293b', darkText: '#94A3B8' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  const colors = BADGE_COLORS[status] ?? BADGE_COLORS['Unlikely']
  const bg   = isDark ? colors.darkBg   : colors.bg
  const text = isDark ? colors.darkText : colors.text

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {status}
    </span>
  )
}
