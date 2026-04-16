import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationCard } from '../ApplicationCard'
import type { Application } from '@jobtracker/shared'

const baseApplication: Application = {
  id: 'app-uuid-1',
  user_id: 'user-uuid-1',
  job_title: 'Software Engineer',
  company: 'Acme Corp',
  company_logo_url: undefined,
  is_referral: false,
  date_applied: '2026-04-07T12:00:00.000Z',
  status: 'Applied',
  created_at: '2026-04-07T00:00:00.000Z',
  updated_at: '2026-04-07T00:00:00.000Z',
}

describe('ApplicationCard', () => {
  describe('content rendering', () => {
    it('renders the job title', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    it('renders the company name', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('renders the date_applied formatted as "Apr 7, 2026"', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.getByText('Apr 7, 2026')).toBeInTheDocument()
    })

    it('renders a status badge', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.getByText('Applied')).toBeInTheDocument()
    })

    it('renders compensation when provided', () => {
      const app = { ...baseApplication, compensation: '$150,000' }
      render(<ApplicationCard application={app} onClick={vi.fn()} />)
      expect(screen.getByText('$150,000')).toBeInTheDocument()
    })

    it('does not render compensation when absent', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    })
  })

  describe('referral chip', () => {
    it('shows Referral chip when is_referral is true', () => {
      const app = { ...baseApplication, is_referral: true }
      render(<ApplicationCard application={app} onClick={vi.fn()} />)
      expect(screen.getByText('Referral')).toBeInTheDocument()
    })

    it('does not show Referral chip when is_referral is false', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      expect(screen.queryByText('Referral')).not.toBeInTheDocument()
    })
  })

  describe('company avatar', () => {
    it('renders company logo img when company_logo_url is set', () => {
      const app = {
        ...baseApplication,
        company_logo_url: 'https://acme.com/logo.png',
      }
      render(<ApplicationCard application={app} onClick={vi.fn()} />)
      expect(
        screen.getByRole('img', { name: /acme corp logo/i }),
      ).toBeInTheDocument()
    })

    it('renders initials avatar when company_logo_url is null/undefined', () => {
      render(<ApplicationCard application={baseApplication} onClick={vi.fn()} />)
      // CompanyAvatar renders a div with role="img" and aria-label=company
      expect(screen.getByRole('img', { name: 'Acme Corp' })).toBeInTheDocument()
    })
  })

  describe('click interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const handleClick = vi.fn()
      render(<ApplicationCard application={baseApplication} onClick={handleClick} />)

      const card = screen.getByRole('button', {
        name: /software engineer at acme corp/i,
      })
      await userEvent.click(card)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Enter key is pressed', async () => {
      const handleClick = vi.fn()
      render(<ApplicationCard application={baseApplication} onClick={handleClick} />)

      const card = screen.getByRole('button', {
        name: /software engineer at acme corp/i,
      })
      card.focus()
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Space key is pressed', async () => {
      const handleClick = vi.fn()
      render(<ApplicationCard application={baseApplication} onClick={handleClick} />)

      const card = screen.getByRole('button', {
        name: /software engineer at acme corp/i,
      })
      card.focus()
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })
})
