import { describe, expect, it } from 'vitest'
import type { ApplicationStatus } from '@jobtracker/shared'
import { describeWeekly, formatDays, formatPercent, statusBreakdown, weeklyCounts } from './dashboard'

const applied = (...dates: string[]) => dates.map((date_applied) => ({ date_applied }))

describe('weeklyCounts', () => {
  // Wednesday, Oct 21, 2026; weeks start on Monday
  const options = { today: '2026-10-21', weekStart: 1 }

  it('gives the last 8 weeks, oldest first, labelled by their first day', () => {
    const data = weeklyCounts([], options)
    expect(data.map((d) => d.label)).toEqual([
      'Aug 31', 'Sep 7', 'Sep 14', 'Sep 21', 'Sep 28', 'Oct 5', 'Oct 12', 'Oct 19',
    ])
    expect(data.every((d) => d.value === 0)).toBe(true)
  })

  it('counts each application in the week that holds its date', () => {
    const data = weeklyCounts(applied('2026-10-19', '2026-10-25', '2026-10-18', '2026-08-31'), options)
    expect(data.map((d) => d.value)).toEqual([1, 0, 0, 0, 0, 0, 1, 2])
  })

  it('ignores applications before the first week or after this one', () => {
    const data = weeklyCounts(applied('2026-08-30', '2026-10-26'), options)
    expect(data.every((d) => d.value === 0)).toBe(true)
  })

  it('follows the week start', () => {
    const data = weeklyCounts(applied('2026-10-18'), { ...options, weekStart: 0, weeks: 2 })
    expect(data).toEqual([
      { label: 'Oct 11', value: 0 },
      { label: 'Oct 18', value: 1 },
    ])
  })

  it('leaves the year off labels across a new year', () => {
    const data = weeklyCounts([], { today: '2027-01-06', weekStart: 1, weeks: 2 })
    expect(data.map((d) => d.label)).toEqual(['Dec 28', 'Jan 4'])
  })
})

describe('statusBreakdown', () => {
  it('gives the five categories in series order, with Role Eliminated under Rejected', () => {
    const statuses: ApplicationStatus[] = ['Applied', 'Applied', 'Offer', 'Rejected', 'Role Eliminated']
    expect(statusBreakdown(statuses.map((status) => ({ status })))).toEqual([
      { label: 'Applied', value: 2 },
      { label: 'Interviewing', value: 0 },
      { label: 'Offer', value: 1 },
      { label: 'Rejected', value: 2 },
      { label: 'Unlikely', value: 0 },
    ])
  })
})

describe('describeWeekly', () => {
  it('sums the weeks and names the first peak', () => {
    const data = [
      { label: 'Oct 5', value: 3 },
      { label: 'Oct 12', value: 8 },
      { label: 'Oct 19', value: 8 },
    ]
    expect(describeWeekly(data)).toBe('19 applications over 3 weeks, peak 8 in the week of Oct 12')
  })

  it('leaves out the peak when there is nothing to show', () => {
    expect(describeWeekly([{ label: 'Oct 19', value: 0 }])).toBe('0 applications over 1 week')
  })
})

describe('formatting', () => {
  it('formats days with at most one decimal', () => {
    expect(formatDays(6.42)).toBe('6.4 days')
    expect(formatDays(11)).toBe('11 days')
    expect(formatDays(1)).toBe('1 day')
    expect(formatDays(1.04)).toBe('1 day')
  })

  it('formats percentages with at most one decimal', () => {
    expect(formatPercent(23.81)).toBe('23.8%')
    expect(formatPercent(40)).toBe('40%')
  })
})
