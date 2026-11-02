import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToasts, dismissToast, getToasts, removeToast, subscribeToasts, toast } from './toast'

describe('toast store', () => {
  beforeEach(() => clearToasts())

  it('adds toasts in order with tone-based durations', () => {
    toast({ title: 'Saved' })
    toast({ tone: 'warning', title: 'Slow' })
    toast({ tone: 'danger', title: 'Failed' })
    toast({ tone: 'positive', title: 'Done', duration: 1000 })
    expect(getToasts().map((t) => [t.title, t.tone, t.duration])).toEqual([
      ['Saved', 'neutral', 5000],
      ['Slow', 'warning', 8000],
      ['Failed', 'danger', Infinity],
      ['Done', 'positive', 1000],
    ])
  })

  it('starts the oldest leaving when a 4th shows', () => {
    const [first, second] = [1, 2, 3, 4].map((n) => toast({ title: `Toast ${n}` }))
    expect(getToasts().filter((t) => t.leaving).map((t) => t.id)).toEqual([first])
    toast({ title: 'Toast 5' })
    expect(getToasts().filter((t) => t.leaving).map((t) => t.id)).toEqual([first, second])
  })

  it('dismisses by marking leaving, and removes on request', () => {
    const id = toast({ title: 'Saved' })
    dismissToast(id)
    expect(getToasts()[0].leaving).toBe(true)
    removeToast(id)
    expect(getToasts()).toEqual([])
  })

  it('notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)
    toast({ title: 'Saved' })
    unsubscribe()
    toast({ title: 'Again' })
    expect(listener).toHaveBeenCalledOnce()
  })
})
