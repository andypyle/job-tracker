import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Acme Corp')).toBe('AC')
    expect(getInitials('Northwind Traders International')).toBe('NT')
  })

  it('uppercases a single word', () => {
    expect(getInitials('google')).toBe('G')
  })

  it('skips punctuation and extra spaces', () => {
    expect(getInitials('  Acme,  Inc. ')).toBe('AI')
    expect(getInitials('AT&T')).toBe('AT')
  })

  it('handles letters outside ASCII', () => {
    expect(getInitials('Émile Ölund')).toBe('ÉÖ')
  })

  it('returns an empty string when there is nothing to use', () => {
    expect(getInitials('')).toBe('')
    expect(getInitials('---')).toBe('')
    expect(getInitials(undefined)).toBe('')
  })
})
