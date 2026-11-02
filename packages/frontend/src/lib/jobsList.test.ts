import { describe, expect, it } from 'vitest'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { describeActive, matchesSearch, newestFirst } from './jobsList'

const app = (fields: Partial<Application>): Application => ({
  id: '1',
  user_id: 'user-1',
  job_title: 'Product Designer',
  company: 'Acme',
  is_referral: false,
  date_applied: '2026-10-01',
  status: 'Applied',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
  ...fields,
})

describe('matchesSearch', () => {
  const application = app({ job_title: 'Staff UX Engineer', company: 'Brightline Health' })

  it('matches the title or the company, ignoring case and outer spaces', () => {
    expect(matchesSearch(application, 'ux eng')).toBe(true)
    expect(matchesSearch(application, '  BRIGHTLINE ')).toBe(true)
    expect(matchesSearch(application, 'northwind')).toBe(false)
  })

  it('matches everything with an empty query', () => {
    expect(matchesSearch(application, '')).toBe(true)
    expect(matchesSearch(application, '   ')).toBe(true)
  })
})

describe('newestFirst', () => {
  it('sorts by date applied, then by when it was added', () => {
    const list = [
      app({ id: 'a', date_applied: '2026-09-24' }),
      app({ id: 'b', date_applied: '2026-10-02', created_at: '2026-10-02T09:00:00Z' }),
      app({ id: 'c', date_applied: '2026-10-02', created_at: '2026-10-02T15:00:00Z' }),
    ]
    expect(list.sort(newestFirst).map((a) => a.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('describeActive', () => {
  const withStatuses = (...statuses: ApplicationStatus[]) => statuses.map((status) => app({ status }))

  it('counts the list, interviews and offers', () => {
    expect(describeActive(withStatuses('Applied', 'Interviewing', 'Interviewing', 'Offer'))).toBe(
      '4 in progress · 2 interviewing · 1 offer',
    )
    expect(describeActive(withStatuses('Offer', 'Offer'))).toBe('2 in progress · 2 offers')
  })

  it('leaves out groups with none', () => {
    expect(describeActive(withStatuses('Applied'))).toBe('1 in progress')
  })
})
