/**
 * A CSS `cubic-bezier()` timing function for JS-driven motion: maps progress (0–1) to eased
 * progress. Solves for the curve's parameter by Newton's method, falling back to bisection.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx

  const solve = (x: number) => {
    let s = x
    for (let i = 0; i < 8; i++) {
      const error = sampleX(s) - x
      if (Math.abs(error) < 1e-6) return s
      const slope = slopeX(s)
      if (Math.abs(slope) < 1e-6) break
      s -= error / slope
    }
    let lo = 0
    let hi = 1
    s = x
    while (hi - lo > 1e-6) {
      if (sampleX(s) < x) lo = s
      else hi = s
      s = (lo + hi) / 2
    }
    return s
  }

  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solve(t)))
}

/** ease/out from tokens.css (`--ease-out`), for motion that CSS can't drive */
export const easeOut = cubicBezier(0.2, 0.8, 0.2, 1)
