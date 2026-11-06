import { describe, expect, it } from 'vitest'
import { getDemoCredentials, isDemoUser } from './demo'

describe('isDemoUser', () => {
  it('is true only when app_metadata.demo is true', () => {
    expect(isDemoUser({ app_metadata: { provider: 'email', demo: true } })).toBe(true)
    expect(isDemoUser({ app_metadata: { provider: 'email' } })).toBe(false)
    expect(isDemoUser({ app_metadata: { demo: 'true' } })).toBe(false)
    expect(isDemoUser(null)).toBe(false)
  })
})

describe('getDemoCredentials', () => {
  it('needs both the email and the password', () => {
    expect(getDemoCredentials({ VITE_DEMO_EMAIL: 'demo@example.com', VITE_DEMO_PASSWORD: 'pw' })).toEqual({
      email: 'demo@example.com',
      password: 'pw',
    })
    expect(getDemoCredentials({ VITE_DEMO_EMAIL: 'demo@example.com' })).toBeUndefined()
    // The Docker entrypoint writes "" for unset vars
    expect(getDemoCredentials({ VITE_DEMO_EMAIL: '', VITE_DEMO_PASSWORD: '' })).toBeUndefined()
  })
})
