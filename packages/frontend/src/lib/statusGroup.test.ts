import { describe, expect, it } from 'vitest'
import { statusGroup } from './statusGroup'

describe('statusGroup', () => {
  it('puts Applied, Interviewing and Offer in active', () => {
    expect(statusGroup('Applied')).toBe('active')
    expect(statusGroup('Interviewing')).toBe('active')
    expect(statusGroup('Offer')).toBe('active')
  })

  it('gives Unlikely its own group', () => {
    expect(statusGroup('Unlikely')).toBe('unlikely')
  })

  it('puts Role Eliminated with Rejected', () => {
    expect(statusGroup('Rejected')).toBe('rejected')
    expect(statusGroup('Role Eliminated')).toBe('rejected')
  })
})
