import type { Application, ApplicationStatus } from '@jobtracker/shared'
import type { BarChartDatum } from '../components/BarChart/BarChart.types'
import type { DonutChartDatum } from '../components/DonutChart/DonutChart.types'
import { addDays, daysIntoWeek, formatMonthDay, todayISO, weekStartForLocale } from './calendarDate'

/**
 * Applications per week for the last `weeks` weeks, oldest first, ending with the week that holds
 * `today`. Each week is labelled by its first day ("Oct 6"); older applications aren't counted.
 */
export function weeklyCounts(
  applications: Pick<Application, 'date_applied'>[],
  { today = todayISO(), weeks = 8, weekStart = weekStartForLocale() } = {},
): BarChartDatum[] {
  const thisWeek = addDays(today, -daysIntoWeek(today, weekStart))
  const starts = Array.from({ length: weeks }, (_, i) => addDays(thisWeek, (i - weeks + 1) * 7))
  const counts = starts.map(() => 0)

  for (const { date_applied } of applications) {
    const start = addDays(date_applied, -daysIntoWeek(date_applied, weekStart))
    const i = starts.indexOf(start)
    if (i !== -1) counts[i]++
  }

  return starts.map((start, i) => ({ label: formatMonthDay(start), value: counts[i] }))
}

// Series 1 to 5 in the order of the Figma ChartCard/Status pattern
const breakdown: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: 'Applied', statuses: ['Applied'] },
  { label: 'Interviewing', statuses: ['Interviewing'] },
  { label: 'Offer', statuses: ['Offer'] },
  { label: 'Rejected', statuses: ['Rejected', 'Role Eliminated'] },
  { label: 'Unlikely', statuses: ['Unlikely'] },
]

/** The five donut categories. Rejected includes Role Eliminated, as in the Jobs lists. */
export function statusBreakdown(applications: Pick<Application, 'status'>[]): DonutChartDatum[] {
  return breakdown.map(({ label, statuses }) => ({
    label,
    value: applications.filter((a) => statuses.includes(a.status)).length,
  }))
}

/** "42 applications over 8 weeks, peak 8 in the week of Oct 6", for the BarChart's label */
export function describeWeekly(data: BarChartDatum[]): string {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const summary = `${plural(total, 'application')} over ${plural(data.length, 'week')}`
  if (total === 0) return summary
  const peak = data.reduce((max, d) => (d.value > max.value ? d : max))
  return `${summary}, peak ${peak.value} in the week of ${peak.label}`
}

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

/** "1 application", "24 applications" */
export const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

/** "6.4 days", "11 days", "1 day"; at most one decimal */
export const formatDays = (n: number) => {
  const shown = oneDecimal.format(n)
  return `${shown} ${shown === '1' ? 'day' : 'days'}`
}

/** "38.1%", "40%" */
export const formatPercent = (n: number) => `${oneDecimal.format(n)}%`
