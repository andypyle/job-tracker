import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApplications, getTimelineStats } from '../lib/api'
import type { TimelineStats } from '@jobtracker/shared'
import { StatCard } from '../components/StatCard'
import { ApplicationsChart } from '../components/ApplicationsChart'
import { StatusChart } from '../components/StatusChart'
import { calculateDashboardStats } from '../utils/dashboardStats'
import { ApplicationModal } from '../components/ApplicationModal'

// ---------------------------------------------------------------------------
// SVG icons (Heroicons outline 24px) — no emojis per design system rules
// ---------------------------------------------------------------------------

function IconBriefcase() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-4.073M15.75 7.5V6a2.25 2.25 0 00-2.25-2.25h-3A2.25 2.25 0 008.25 6v1.5m7.5 0H8.25m7.5 0v.75M8.25 7.5v.75m7.5 0H8.25"
      />
    </svg>
  )
}

function IconFire() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6c0-2.209.823-4.222 2.162-5.77a.75.75 0 011.2.914 6.75 6.75 0 00-1.632 4.27A8.25 8.25 0 0112 3.75c.67 0 1.32.084 1.94.24a.75.75 0 01.422 1.224z"
      />
    </svg>
  )
}

function IconStar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}

function IconChart() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  )
}

/** Clock icon — used for response-time metric card */
function IconClock() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/** Arrow trending up icon — used for interview rate metric card */
function IconTrendingUp() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  )
}

/** Calendar days icon — used for interview-duration metric card */
function IconCalendar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-2.5 w-24 bg-gray-100 rounded" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      <div className="h-48 bg-gray-100 rounded-xl" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8"
          style={{ color: 'var(--color-primary)' }}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-4.073M15.75 7.5V6a2.25 2.25 0 00-2.25-2.25h-3A2.25 2.25 0 008.25 6v1.5m7.5 0H8.25"
          />
        </svg>
      </div>
      <div>
        <h2
          className="text-lg font-semibold"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          No applications yet
        </h2>
        <p className="mt-1 text-sm text-gray-500 max-w-xs">
          Track your job search from one place. Add your first application to get
          started.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: 'var(--color-cta)',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- CSS var used as ring color
          // @ts-ignore
          '--tw-ring-color': 'var(--color-cta)',
        }}
        aria-label="Add your first application"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add your first application
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimelineMetricCard
// ---------------------------------------------------------------------------

interface TimelineMetricCardProps {
  label: string
  /** Formatted value string, or null when there is not enough data */
  value: string | null
  /** First line of subtext shown below the value */
  sublabel?: string
  /** Second line of subtext (e.g., sample size note) */
  sublabel2?: string
  icon: React.ReactNode
  accentColor: string
}

/**
 * A metric card for timeline stats that mirrors StatCard visually but supports
 * a two-line sublabel and a graceful null/empty-data state.
 */
function TimelineMetricCard({
  label,
  value,
  sublabel,
  sublabel2,
  icon,
  accentColor,
}: TimelineMetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          {value !== null ? (
            <>
              <p
                className="mt-1 text-3xl font-semibold tracking-tight"
                style={{
                  color: accentColor,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                {value}
              </p>
              {sublabel && (
                <p className="mt-1 text-xs text-gray-400">{sublabel}</p>
              )}
              {sublabel2 && (
                <p className="mt-0.5 text-xs text-gray-400">{sublabel2}</p>
              )}
            </>
          ) : (
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Not enough data yet
            </p>
          )}
        </div>
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}18` }}
          aria-hidden="true"
        >
          <span style={{ color: accentColor }} className="w-5 h-5">
            {icon}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimelineStatsRow — renders the three velocity metric cards
// ---------------------------------------------------------------------------

interface TimelineStatsRowProps {
  stats: TimelineStats | undefined
  isLoading: boolean
}

function TimelineStatsRow({ stats, isLoading }: TimelineStatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  // When the endpoint errored or returned nothing, render cards in null state.
  const avgResponseDays = stats?.avg_response_days ?? null
  const interviewRate = stats?.interview_conversion_rate ?? null
  const interviewDuration = stats?.avg_interview_to_outcome_days ?? null
  const sampleSizes = stats?.sample_sizes

  const responseValue =
    avgResponseDays !== null
      ? `${Math.round(avgResponseDays)} days`
      : null

  const rateValue =
    interviewRate !== null
      ? `${Math.round(interviewRate * 100)}%`
      : null

  const durationValue =
    interviewDuration !== null
      ? `${Math.round(interviewDuration)} days`
      : null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <TimelineMetricCard
        label="Avg. Response Time"
        value={responseValue}
        sublabel={
          sampleSizes && avgResponseDays !== null
            ? `based on ${sampleSizes.response_time} application${sampleSizes.response_time === 1 ? '' : 's'}`
            : undefined
        }
        icon={<IconClock />}
        accentColor="var(--color-primary)"
      />
      <TimelineMetricCard
        label="Interview Rate"
        value={rateValue}
        sublabel={
          interviewRate !== null
            ? 'of applications reached interview stage'
            : undefined
        }
        sublabel2={
          sampleSizes && interviewRate !== null
            ? `based on ${sampleSizes.conversion_rate} application${sampleSizes.conversion_rate === 1 ? '' : 's'}`
            : undefined
        }
        icon={<IconTrendingUp />}
        accentColor="#8B5CF6"
      />
      <TimelineMetricCard
        label="Avg. Interview Duration"
        value={durationValue}
        sublabel={
          interviewDuration !== null
            ? 'from interview to outcome'
            : undefined
        }
        sublabel2={
          sampleSizes && interviewDuration !== null
            ? `based on ${sampleSizes.interview_to_outcome} application${sampleSizes.interview_to_outcome === 1 ? '' : 's'}`
            : undefined
        }
        icon={<IconCalendar />}
        accentColor="#F59E0B"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const {
    data: applications,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['applications'],
    queryFn: () => getApplications(),
  })

  // Timeline stats are fetched independently so a failure here cannot crash
  // the rest of the dashboard. The TimelineStatsRow handles its own null/error state.
  const {
    data: timelineStats,
    isLoading: timelineLoading,
  } = useQuery({
    queryKey: ['timeline-stats'],
    queryFn: () => getTimelineStats(),
    // On error, TanStack Query will leave `data` as undefined — TimelineStatsRow
    // renders the "Not enough data yet" null state for all three cards.
    retry: 1,
  })

  function handleAddApplication() {
    setModalOpen(true)
  }

  // ---- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-7 w-36 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  // ---- Error state ---------------------------------------------------------
  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-medium">
            Failed to load applications. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  const apps = applications ?? []
  const stats = calculateDashboardStats(apps)

  // ---- Empty state ---------------------------------------------------------
  if (apps.length === 0) {
    return (
      <div className="p-6">
        <h1
          className="text-2xl font-semibold mb-6"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          Dashboard
        </h1>
        <EmptyState onAdd={handleAddApplication} />
        <ApplicationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['applications'] })
          }}
        />
      </div>
    )
  }

  // ---- Populated state -----------------------------------------------------
  return (
    <div className="p-6">
      <h1
        className="text-2xl font-semibold mb-6"
        style={{
          color: 'var(--color-text)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}
      >
        Dashboard
      </h1>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Applications"
          value={stats.total}
          icon={<IconBriefcase />}
          accentColor="var(--color-primary)"
        />
        <StatCard
          label="Active"
          value={stats.active}
          sublabel="Applied + Interviewing"
          icon={<IconFire />}
          accentColor="#F59E0B"
        />
        <StatCard
          label="Offers"
          value={stats.offers}
          icon={<IconStar />}
          accentColor="#10B981"
        />
        <StatCard
          label="Response Rate"
          value={`${stats.responseRate}%`}
          sublabel="Responses received"
          icon={<IconChart />}
          accentColor="var(--color-cta)"
        />
      </div>

      {/* Timeline velocity metrics */}
      <TimelineStatsRow
        stats={timelineStats}
        isLoading={timelineLoading}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly applications bar chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Applications per Week
          </h2>
          <ApplicationsChart applications={apps} />
        </div>

        {/* Status donut chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Applications by Status
          </h2>
          <StatusChart applications={apps} />
        </div>
      </div>

      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['applications'] })
        }}
      />
    </div>
  )
}
