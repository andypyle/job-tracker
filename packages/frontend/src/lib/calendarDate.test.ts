import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatDisplayDate,
  formatLongDate,
  monthGrid,
  parseDateInput,
} from './calendarDate'

describe('parseDateInput', () => {
  const reference = '2026-11-01'

  it.each([
    ['Oct 21', '2026-10-21'],
    ['oct 21', '2026-10-21'],
    ['Oct. 21', '2026-10-21'],
    ['October 21, 2026', '2026-10-21'],
    ['Oct 21 2025', '2025-10-21'],
    ['Oct 21st', '2026-10-21'],
    ['10/21', '2026-10-21'],
    ['10/21/26', '2026-10-21'],
    ['10/21/2026', '2026-10-21'],
    ['10-21-2026', '2026-10-21'],
    ['2026-10-21', '2026-10-21'],
    ['  Oct 21, 2026  ', '2026-10-21'],
  ])('reads %j', (text, expected) => {
    expect(parseDateInput(text, reference)).toBe(expected)
  })

  it.each(['', 'yesterday', 'Oct', '13/01/2026', 'Feb 30', '2026-02-29', 'Octx 21', 'xyz 21'])(
    'rejects %j',
    (text) => {
      expect(parseDateInput(text, reference)).toBeNull()
    },
  )

  it('accepts Feb 29 in a leap year', () => {
    expect(parseDateInput('2/29/2028', reference)).toBe('2028-02-29')
  })
})

describe('date math', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('adds months, keeping the day where it can', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-10-21', -12)).toBe('2025-10-21')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('builds a 6-week grid from the week start', () => {
    const sundayFirst = monthGrid('2026-10-01', 0)
    expect(sundayFirst).toHaveLength(42)
    // October 1, 2026 is a Thursday
    expect(sundayFirst[0]).toBe('2026-09-27')
    expect(sundayFirst[41]).toBe('2026-11-07')
    expect(monthGrid('2026-10-01', 1)[0]).toBe('2026-09-28')
  })
})

describe('formatting', () => {
  it('formats for the field and for screen readers', () => {
    expect(formatDisplayDate('2026-10-21')).toBe('Oct 21, 2026')
    expect(formatLongDate('2026-10-21')).toBe('Wednesday, October 21, 2026')
  })
})
