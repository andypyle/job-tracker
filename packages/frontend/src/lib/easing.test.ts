import { describe, expect, it } from 'vitest'
import { cubicBezier, easeOut } from './easing'

describe('cubicBezier', () => {
  it('pins the ends', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(-0.5)).toBe(0)
    expect(easeOut(2)).toBe(1)
  })

  it('is the identity for a linear curve', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(linear(t)).toBeCloseTo(t, 5)
  })

  it('matches known values of the CSS ease curve', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1)
    expect(ease(0.5)).toBeCloseTo(0.8024, 3)
  })

  it('front-loads ease/out and never goes backwards', () => {
    expect(easeOut(0.25)).toBeGreaterThan(0.5)
    let last = 0
    for (let t = 0; t <= 1; t += 0.05) {
      const y = easeOut(t)
      expect(y).toBeGreaterThanOrEqual(last)
      last = y
    }
  })
})
