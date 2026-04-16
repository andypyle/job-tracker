import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '../StatusBadge'
import { STATUS_COLORS } from '@jobtracker/shared'
import type { ApplicationStatus } from '@jobtracker/shared'

const ALL_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Interviewing',
  'Unlikely',
  'Offer',
  'Rejected',
  'Role Eliminated',
]

describe('StatusBadge', () => {
  it.each(ALL_STATUSES)(
    'renders correct text for status "%s"',
    (status) => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
    },
  )

  it.each(ALL_STATUSES)(
    'applies correct bg class from STATUS_COLORS for "%s"',
    (status) => {
      const { container } = render(<StatusBadge status={status} />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain(STATUS_COLORS[status].bg)
    },
  )

  it.each(ALL_STATUSES)(
    'applies correct text class from STATUS_COLORS for "%s"',
    (status) => {
      const { container } = render(<StatusBadge status={status} />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain(STATUS_COLORS[status].text)
    },
  )

  it('renders as an inline span element', () => {
    const { container } = render(<StatusBadge status="Applied" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })
})
