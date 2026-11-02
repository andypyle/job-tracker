import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Application, TimelineStats } from '@jobtracker/shared'
import { Alert } from '../components/Alert/Alert'
import { BarChart } from '../components/BarChart/BarChart'
import { Button } from '../components/Button/Button'
import { Card, CardHeader, CardTitle } from '../components/Card/Card'
import { DonutChart } from '../components/DonutChart/DonutChart'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { Stat } from '../components/Stat/Stat'
import { useAuth } from '../hooks/useAuth'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getApplications, getTimelineStats } from '../lib/api'
import { todayISO, type ISODate } from '../lib/calendarDate'
import {
  describeWeekly,
  formatDays,
  formatPercent,
  plural,
  statusBreakdown,
  weeklyCounts,
} from '../lib/dashboard'
import { getFirstName } from '../lib/userName'
import { calculateDashboardStats } from '../utils/dashboardStats'
import { useAddApplication } from './AppLayout'

export interface DashboardScreenProps {
  firstName: string
  /** Undefined while loading */
  applications: Application[] | undefined
  applicationsError?: boolean
  /** Undefined while loading or after an error */
  timeline: TimelineStats | undefined
  timelineError?: boolean
  onAddApplication: () => void
  /** Ends the weekly chart; for stories */
  today?: ISODate
}

/** The Dashboard, without data fetching */
export function DashboardScreen({
  firstName,
  applications,
  applicationsError = false,
  timeline,
  timelineError = false,
  onAddApplication,
  today = todayISO(),
}: DashboardScreenProps) {
  // Below md the Bottom bar has "Add application", so the header has no actions (as in Figma)
  const desktop = useMediaQuery('(min-width: 48rem)')
  const addButton = (
    <Button variant="primary" icon="plus" onClick={onAddApplication}>
      Add application
    </Button>
  )

  const empty = applications?.length === 0
  let content: ReactNode
  if (applicationsError) {
    content = <Alert tone="danger">We couldn’t load your applications. Refresh the page to try again.</Alert>
  } else if (empty) {
    // As in Jobs: Empty, centered in the space under the header, which then has no action
    content = (
      <EmptyState
        className="my-auto py-12"
        title="Add your first application"
        description="Paste a job link and we’ll fill in the title, company and logo. Everything else is optional."
        action={addButton}
      />
    )
  } else {
    content = (
      <>
        <Stats applications={applications} timeline={timeline} timelineError={timelineError} />
        <Charts applications={applications} today={today} />
      </>
    )
  }

  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} actions={desktop && !empty ? addButton : undefined} />
      <div className="@container flex flex-1 flex-col gap-3 p-4 md:gap-4 md:px-10 md:pt-8 md:pb-10">{content}</div>
    </>
  )
}

function Stats({
  applications,
  timeline,
  timelineError,
}: {
  applications: Application[] | undefined
  timeline: TimelineStats | undefined
  timelineError: boolean
}) {
  const loading = applications === undefined
  const stats = calculateDashboardStats(applications ?? [])
  const timelineLoading = timeline === undefined && !timelineError
  const sizes = timeline?.sample_sizes

  // A timeline value is null until there's enough history to average
  const timelineStat = (value: number | null | undefined, sampleSize: number | undefined) =>
    value == null || sampleSize === undefined
      ? { value: '—', sublabel: timelineError ? 'Couldn’t load this' : 'Not enough data yet' }
      : { value, sublabel: `Based on ${plural(sampleSize, 'application')}` }

  const interviewRate = timeline?.interview_conversion_rate

  return (
    // Two columns below the container's 48rem; then four stats over three, as in Figma
    <div className="grid grid-cols-2 gap-3 md:gap-4 @3xl:grid-cols-12">
      <Stat className="@3xl:col-span-3" label="Total applications" value={stats.total} loading={loading} />
      <Stat className="@3xl:col-span-3" label="Active" value={stats.active} sublabel="Applied + interviewing" loading={loading} />
      <Stat className="@3xl:col-span-3" label="Offers" value={stats.offers} tone="positive" emphasis="strong" loading={loading} />
      <Stat
        className="@3xl:col-span-3"
        label="Response rate"
        value={stats.responseRate}
        format={formatPercent}
        sublabel="Responses received"
        tone="info"
        loading={loading}
      />
      <Stat
        className="@3xl:col-span-4"
        label="Avg. response time"
        {...timelineStat(timeline?.avg_response_days, sizes?.response_time)}
        format={formatDays}
        loading={timelineLoading}
      />
      <Stat
        className="@3xl:col-span-4"
        label="Interview rate"
        {...timelineStat(interviewRate == null ? interviewRate : interviewRate * 100, sizes?.conversion_rate)}
        format={formatPercent}
        loading={timelineLoading}
      />
      <Stat
        className="col-span-2 @3xl:col-span-4"
        label="Interview → outcome"
        {...timelineStat(timeline?.avg_interview_to_outcome_days, sizes?.interview_to_outcome)}
        format={formatDays}
        loading={timelineLoading}
      />
    </div>
  )
}

function Charts({ applications, today }: { applications: Application[] | undefined; today: ISODate }) {
  const weekly = applications && weeklyCounts(applications, { today })

  return (
    <div className="grid gap-3 md:gap-4 @4xl:grid-cols-2">
      <ChartCard title="Applications per week" loading={!weekly}>
        {weekly && <BarChart data={weekly} label={describeWeekly(weekly)} />}
      </ChartCard>
      <ChartCard title="Applications by status" loading={!applications}>
        {applications && (
          <DonutChart
            // Ring, 32px and legend need about 325px; a 390px phone gives the body 310. Figma's
            // mobile frame clips the legend there, so the gap narrows instead.
            className="max-md:gap-x-4"
            data={statusBreakdown(applications)}
            label="Applications by status"
            totalLabel="applications"
          />
        )}
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, loading, children }: { title: string; loading: boolean; children: ReactNode }) {
  return (
    <Card aria-busy={loading || undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {loading ? (
        // As tall as either chart (the bar plot and its labels, or the 180px ring), pulsing like Stat
        <div aria-hidden="true" className="h-46 animate-pulse-opacity rounded-xs bg-bg-skeleton" />
      ) : (
        children
      )}
    </Card>
  )
}

/** The `/` route: the Dashboard wired to the API and the signed-in user */
export function DashboardPage() {
  const { user } = useAuth()
  const openAddApplication = useAddApplication()
  const applications = useQuery({ queryKey: ['applications'], queryFn: () => getApplications() })
  // Fetched on its own, so a failure here leaves the rest of the Dashboard working
  const timeline = useQuery({ queryKey: ['timeline-stats'], queryFn: getTimelineStats, retry: 1 })

  return (
    <DashboardScreen
      firstName={getFirstName(user)}
      applications={applications.data}
      applicationsError={applications.isError}
      timeline={timeline.data}
      timelineError={timeline.isError}
      onAddApplication={openAddApplication}
    />
  )
}
