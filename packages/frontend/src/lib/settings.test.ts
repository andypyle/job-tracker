import { describe, expect, it } from 'vitest'
import { UNLIKELY_AFTER_DAYS_OPTIONS } from '@jobtracker/shared'
import {
  describeUnlikelyAfter,
  fromUnlikelyAfterValue,
  toUnlikelyAfterValue,
  unlikelyAfterOptions,
  unlikelyListCopy,
} from './settings'

describe('unlikelyAfterOptions', () => {
  it('lists the day counts, then Never', () => {
    expect(unlikelyAfterOptions.map((option) => option.label)).toEqual([
      '7 days',
      '14 days',
      '21 days',
      '30 days',
      '60 days',
      'Never',
    ])
  })
})

describe('toUnlikelyAfterValue / fromUnlikelyAfterValue', () => {
  it('round-trips every allowed setting, including never', () => {
    for (const days of [...UNLIKELY_AFTER_DAYS_OPTIONS, null]) {
      expect(fromUnlikelyAfterValue(toUnlikelyAfterValue(days))).toBe(days)
    }
  })

  it('uses `never` for null and the number otherwise', () => {
    expect(toUnlikelyAfterValue(null)).toBe('never')
    expect(toUnlikelyAfterValue(30)).toBe('30')
    expect(fromUnlikelyAfterValue('7')).toBe(7)
  })
})

describe('describeUnlikelyAfter', () => {
  it('says what the setting does', () => {
    expect(describeUnlikelyAfter(21)).toBe('Applications move to Unlikely after 21 days in Applied.')
    expect(describeUnlikelyAfter(null)).toBe('Applications stay in Applied until you move them.')
  })
})

describe('unlikelyListCopy', () => {
  it('names the cutoff', () => {
    expect(unlikelyListCopy(30)).toEqual({
      description: 'No status change in 30 days. Change a status to move it back.',
      empty: 'Applications move here after 30 days in Applied with no status change.',
    })
  })

  it('says when the move is off', () => {
    expect(unlikelyListCopy(null).empty).toBe('The automatic move to Unlikely is off. You can turn it on in Settings.')
  })

  it('stays vague while the setting loads', () => {
    expect(unlikelyListCopy(undefined).description).toBe('No recent status change. Change a status to move it back.')
  })
})
