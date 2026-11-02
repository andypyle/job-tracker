import { describe, expect, it } from 'vitest'
import { getDisplayName, getFirstName } from './userName'

describe('getDisplayName', () => {
  it('uses full_name from the user metadata', () => {
    expect(getDisplayName({ email: 'sam@example.com', user_metadata: { full_name: 'Sam Rivera' } })).toBe(
      'Sam Rivera',
    )
  })

  it('tidies whitespace in the name', () => {
    expect(getDisplayName({ email: 'sam@example.com', user_metadata: { full_name: '  Sam   Rivera ' } })).toBe(
      'Sam Rivera',
    )
  })

  it('falls back to the email before the @ when there is no name', () => {
    expect(getDisplayName({ email: 'sam.rivera@example.com', user_metadata: {} })).toBe('sam.rivera')
    expect(getDisplayName({ email: 'sam@example.com', user_metadata: { full_name: '   ' } })).toBe('sam')
    expect(getDisplayName({ email: 'sam@example.com', user_metadata: { full_name: 42 } })).toBe('sam')
  })

  it('returns an empty string without a user', () => {
    expect(getDisplayName(null)).toBe('')
    expect(getDisplayName({ email: undefined, user_metadata: {} })).toBe('')
  })
})

describe('getFirstName', () => {
  it('takes the first word of the name', () => {
    expect(getFirstName({ email: 'sam@example.com', user_metadata: { full_name: 'Sam Rivera' } })).toBe('Sam')
  })

  it('uses the whole email fallback', () => {
    expect(getFirstName({ email: 'sam.rivera@example.com', user_metadata: {} })).toBe('sam.rivera')
  })
})
