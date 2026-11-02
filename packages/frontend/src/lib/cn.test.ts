import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a text style and a text color together', () => {
    expect(cn('text-heading-h1', 'text-text-muted')).toBe('text-heading-h1 text-text-muted')
  })

  it('lets a later text style replace an earlier one', () => {
    expect(cn('text-body-base', 'text-caption-medium')).toBe('text-caption-medium')
  })

  it('lets a later text color replace an earlier one', () => {
    expect(cn('text-text-primary', 'text-tone-info-on-soft')).toBe('text-tone-info-on-soft')
  })

  it('treats shadow-overlay as a shadow', () => {
    expect(cn('shadow-sm', 'shadow-overlay')).toBe('shadow-overlay')
  })
})
