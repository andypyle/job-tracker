import { describe, expect, it } from 'vitest'
import type { ApplicationStatus, StatusChange } from '@jobtracker/shared'
import { describeChange, displayUrl, fileName, formatTimestamp, historyNewestFirst } from './applicationDetail'

const change = (
  old_status: ApplicationStatus | null,
  new_status: ApplicationStatus,
  changed_at = '2026-10-09T15:14:00Z',
  is_automatic = false,
): StatusChange => ({
  id: `${old_status}-${new_status}`,
  application_id: 'app-1',
  old_status,
  new_status,
  changed_at,
  is_automatic,
})

describe('historyNewestFirst', () => {
  it('puts the latest change first without changing the input', () => {
    const history = [
      change(null, 'Applied', '2026-10-02T10:02:00Z'),
      change('Applied', 'Interviewing', '2026-10-09T15:14:00Z'),
      change('Interviewing', 'Offer', '2026-10-20T09:00:00Z'),
    ]
    expect(historyNewestFirst(history).map((c) => c.new_status)).toEqual(['Offer', 'Interviewing', 'Applied'])
    expect(history[0].new_status).toBe('Applied')
  })

  it('keeps creation last when another change has the same time', () => {
    const at = '2026-10-02T10:02:00Z'
    const history = [change(null, 'Applied', at), change('Applied', 'Interviewing', at)]
    expect(historyNewestFirst(history).map((c) => c.old_status)).toEqual(['Applied', null])
  })
})

describe('describeChange', () => {
  it('describes creation, moves and automatic changes', () => {
    expect(describeChange(change(null, 'Applied'))).toBe('Application created')
    expect(describeChange(change('Applied', 'Interviewing'))).toBe('Moved from Applied to Interviewing')
    expect(describeChange(change('Interviewing', 'Role Eliminated'))).toBe('Moved from Interviewing to Role Eliminated')
    expect(describeChange(change('Applied', 'Unlikely', undefined, true))).toBe(
      'Marked Unlikely after 2 weeks with no status change',
    )
    expect(describeChange(change('Applied', 'Rejected', undefined, true))).toBe('Moved to Rejected automatically')
  })
})

describe('formatTimestamp', () => {
  it('shows the local date and time', () => {
    expect(formatTimestamp(new Date(2026, 9, 9, 15, 14).toISOString())).toBe('Oct 9, 2026 · 3:14 PM')
    expect(formatTimestamp(new Date(2026, 9, 2, 10, 2).toISOString())).toBe('Oct 2, 2026 · 10:02 AM')
  })
})

describe('displayUrl', () => {
  it('drops the protocol, www and a trailing slash', () => {
    expect(displayUrl('https://jobs.northwindlabs.com/designer-412')).toBe('jobs.northwindlabs.com/designer-412')
    expect(displayUrl('http://www.example.com/')).toBe('example.com')
  })
})

describe('fileName', () => {
  it('takes the last part of a storage path', () => {
    expect(fileName('user-1/app-1/resume.pdf')).toBe('resume.pdf')
    expect(fileName('cover_letter.pdf')).toBe('cover_letter.pdf')
  })
})
