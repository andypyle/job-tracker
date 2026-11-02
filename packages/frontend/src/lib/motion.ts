/** Reads a custom property from :root, so JS motion keeps the timing in tokens.css */
function readToken(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}

/** A `--duration-*` token in ms */
export function readDuration(token: string, fallback: number) {
  const raw = readToken(token)
  const value = parseFloat(raw)
  if (Number.isNaN(value)) return fallback
  return raw.endsWith('ms') ? value : value * 1000
}

/** An `--ease-*` token as a timing function, for the Web Animations API (which can't read var()) */
export function readEasing(token: string, fallback: string) {
  return readToken(token) || fallback
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
