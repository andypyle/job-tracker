import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, passwordPair } from './passwords'

function errors(password: string, confirmPassword: string) {
  const result = passwordPair.safeParse({ password, confirmPassword })
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('passwordPair', () => {
  it('accepts a long enough password typed twice', () => {
    const password = 'x'.repeat(MIN_PASSWORD_LENGTH)
    expect(errors(password, password)).toEqual({})
  })

  it('asks for both fields when empty', () => {
    expect(errors('', '')).toEqual({
      password: 'Enter a password',
      confirmPassword: 'Enter your password again',
    })
  })

  it('needs at least the minimum length', () => {
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(errors(short, short)).toEqual({ password: 'Use at least 8 characters.' })
  })

  it('reports a mismatch even while the password is too short', () => {
    expect(errors('short', 'other')).toEqual({
      password: 'Use at least 8 characters.',
      confirmPassword: 'Passwords don’t match.',
    })
  })
})
