import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Application } from '@jobtracker/shared'

interface ApplicationsChartProps {
  applications: Application[]
}

interface WeekBucket {
  label: string
  count: number
  /** ISO date string for the Monday of the week — used for sorting */
  weekStart: string
}

/**
 * Returns the ISO date string (YYYY-MM-DD) of the Monday for a given date.
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Formats a Monday date string as "Apr 7" style label.
 */
function formatWeekLabel(mondayIso: string): string {
  const d = new Date(`${mondayIso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Groups applications into weekly buckets for the last 12 weeks.
 * Weeks are anchored to Monday. Applications outside this range are ignored.
 */
function buildWeeklyData(applications: Application[]): WeekBucket[] {
  const today = new Date()
  const buckets: Map<string, WeekBucket> = new Map()

  // Build 12 empty week buckets going back from the current week
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    const monday = getMondayOfWeek(d)
    if (!buckets.has(monday)) {
      buckets.set(monday, {
        label: `Week of ${formatWeekLabel(monday)}`,
        count: 0,
        weekStart: monday,
      })
    }
  }

  // Populate buckets
  for (const app of applications) {
    const appDate = new Date(`${app.date_applied}T00:00:00`)
    const monday = getMondayOfWeek(appDate)
    if (buckets.has(monday)) {
      const bucket = buckets.get(monday)!
      bucket.count++
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  )
}

/** Custom tooltip for the bar chart */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p style={{ color: 'var(--color-primary)' }}>
        {payload[0].value} application{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export function ApplicationsChart({ applications }: ApplicationsChartProps) {
  const data = buildWeeklyData(applications)
  const hasData = applications.length > 0

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 gap-2">
        <svg
          className="w-10 h-10 opacity-40"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
        <p className="text-sm">No applications yet — add one to see weekly activity.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
        barSize={16}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          // Show abbreviated label to avoid crowding: just "Apr 7"
          tickFormatter={(v: string) => v.replace('Week of ', '')}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F0FDFA' }} />
        <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
