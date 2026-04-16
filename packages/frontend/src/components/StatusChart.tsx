import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { STATUS_LABELS } from '@jobtracker/shared'

interface StatusChartProps {
  applications: Application[]
}

/**
 * Distinct, readable fill colors for each status.
 * These are intentional deviations from the Tailwind bg classes in STATUS_COLORS
 * to ensure visible contrast inside SVG chart slices.
 */
const STATUS_FILL_COLORS: Record<ApplicationStatus, string> = {
  Applied: '#3B82F6',
  Interviewing: '#F59E0B',
  Unlikely: '#9CA3AF',
  Offer: '#10B981',
  Rejected: '#EF4444',
  'Role Eliminated': '#64748B',
}

interface ChartDatum {
  status: ApplicationStatus
  label: string
  count: number
  fill: string
}

function buildChartData(applications: Application[]): ChartDatum[] {
  const counts: Partial<Record<ApplicationStatus, number>> = {}

  for (const app of applications) {
    counts[app.status] = (counts[app.status] ?? 0) + 1
  }

  return (Object.entries(counts) as [ApplicationStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status],
      count,
      fill: STATUS_FILL_COLORS[status],
    }))
    .sort((a, b) => b.count - a.count)
}

/** Custom tooltip */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartDatum }>
}) {
  if (!active || !payload?.length) return null
  const datum = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-sm">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: datum.fill }}
          aria-hidden="true"
        />
        <span className="font-medium text-gray-700">{datum.label}</span>
      </div>
      <p className="mt-0.5 text-gray-500 pl-[18px]">
        {datum.count} application{datum.count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

/** Custom legend rendered below the chart */
function CustomLegend({ data }: { data: ChartDatum[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-3">
      {data.map((d) => (
        <li key={d.status} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: d.fill }}
            aria-hidden="true"
          />
          {d.label} ({d.count})
        </li>
      ))}
    </ul>
  )
}

export function StatusChart({ applications }: StatusChartProps) {
  const data = buildChartData(applications)

  if (data.length === 0) {
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
            d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
          />
        </svg>
        <p className="text-sm">No status data yet. Start applying!</p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* We render our own legend below the chart */}
          <Legend content={<></>} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={data} />
    </div>
  )
}
