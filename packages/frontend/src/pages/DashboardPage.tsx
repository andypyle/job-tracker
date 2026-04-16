import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApplications } from '../lib/api'
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
