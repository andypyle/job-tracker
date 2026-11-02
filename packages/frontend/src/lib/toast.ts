import type { Tone } from './tone'

export interface ToastOptions {
  tone?: Tone
  /** What happened: "Application saved" */
  title: string
  message?: string
  /** A ghost button such as Undo. Pressing it runs `onClick`, then closes the toast. */
  action?: { label: string; onClick: () => void }
  /** In ms. Defaults by tone: 5s, 8s for warning, and danger stays until dismissed. */
  duration?: number
  /** Shows the dismiss button. Defaults to true. */
  dismissible?: boolean
}

export interface ToastRecord extends ToastOptions {
  id: string
  tone: Tone
  duration: number
  /** Playing its exit; removed from the list when that ends */
  leaving: boolean
}

/** At most 3 show; a 4th pushes the oldest out */
export const MAX_TOASTS = 3

export const defaultDurations: Record<Tone, number> = {
  neutral: 5000,
  info: 5000,
  positive: 5000,
  warning: 8000,
  danger: Infinity,
}

let toasts: ToastRecord[] = []
const listeners = new Set<() => void>()
let nextId = 0

function set(next: ToastRecord[]) {
  toasts = next
  listeners.forEach((listener) => listener())
}

/** Shows a toast (the Toaster must be rendered once in the layout). Returns its id. */
export function toast({ tone = 'neutral', duration, ...options }: ToastOptions): string {
  const id = `toast-${++nextId}`
  const record: ToastRecord = { ...options, id, tone, duration: duration ?? defaultDurations[tone], leaving: false }
  const next = [...toasts, record]
  // Past the limit, the oldest still showing starts leaving
  const showing = next.filter((t) => !t.leaving)
  const overflow = new Set(showing.slice(0, Math.max(0, showing.length - MAX_TOASTS)).map((t) => t.id))
  set(next.map((t) => (overflow.has(t.id) ? { ...t, leaving: true } : t)))
  return id
}

/** Starts a toast's exit; the Toaster removes it once the exit has played */
export function dismissToast(id: string) {
  if (toasts.some((t) => t.id === id && !t.leaving)) {
    set(toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
  }
}

/** Removes a toast at once. The Toaster calls this when an exit ends. */
export function removeToast(id: string) {
  set(toasts.filter((t) => t.id !== id))
}

/** Clears every toast at once, for tests and stories */
export function clearToasts() {
  set([])
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts() {
  return toasts
}
