import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon?: ReactNode
  accentColor?: string
}

/**
 * Displays a single summary metric.
 * Static card — no hover effect needed.
 */
export function StatCard({
  label,
  value,
  sublabel,
  icon,
  accentColor,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p
            className="mt-1 text-3xl font-semibold tracking-tight"
            style={{
              color: accentColor ?? 'var(--color-text)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {value}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-gray-400 truncate">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: accentColor
                ? `${accentColor}18`
                : 'var(--color-background)',
            }}
            aria-hidden="true"
          >
            <span
              style={{ color: accentColor ?? 'var(--color-primary)' }}
              className="w-5 h-5"
            >
              {icon}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
