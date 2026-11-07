import { describe, expect, it } from 'vitest'
import { getDemoCredentials } from './demo'

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
