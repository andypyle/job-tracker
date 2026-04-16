import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CompanyAvatar } from '../CompanyAvatar'

describe('CompanyAvatar', () => {
  describe('when logoUrl is provided', () => {
    it('renders an img element with the logo URL', () => {
      render(
        <CompanyAvatar
          company="Acme Corp"
          logoUrl="https://acme.com/logo.png"
        />,
      )
      const img = screen.getByRole('img', { name: /acme corp logo/i })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://acme.com/logo.png')
    })

    it('falls back to initials when the image errors', () => {
      render(
        <CompanyAvatar
          company="Acme Corp"
          logoUrl="https://broken-url.com/logo.png"
        />,
      )

      const img = screen.getByRole('img', { name: /acme corp logo/i })

      // Trigger the onError handler
      fireEvent.error(img)

      // The img should be gone and the initials avatar should appear
      expect(screen.queryByRole('img', { name: /acme corp logo/i })).not.toBeInTheDocument()
      // The initials fallback div has role="img" and aria-label=company
      const fallback = screen.getByRole('img', { name: 'Acme Corp' })
      expect(fallback).toBeInTheDocument()
      expect(fallback.textContent).toBe('AC')
    })
  })

  describe('when no logoUrl is provided', () => {
    it('renders the initials avatar instead of an img', () => {
      render(<CompanyAvatar company="Acme Corp" />)

      // Should not have an img with src
      expect(screen.queryByRole('img', { name: /acme corp logo/i })).not.toBeInTheDocument()

      // Should render the initials div
      const avatar = screen.getByRole('img', { name: 'Acme Corp' })
      expect(avatar).toBeInTheDocument()
      expect(avatar.textContent).toBe('AC')
    })
  })

  describe('initials generation', () => {
    it('shows first letter of each word for multi-word company names', () => {
      render(<CompanyAvatar company="Big Tech Company" />)
      // Only first 2 words → "BT"
      const avatar = screen.getByRole('img', { name: 'Big Tech Company' })
      expect(avatar.textContent).toBe('BT')
    })

    it('shows a single letter for single-word company names', () => {
      render(<CompanyAvatar company="Google" />)
      const avatar = screen.getByRole('img', { name: 'Google' })
      expect(avatar.textContent).toBe('G')
    })

    it('shows max 2 initials even for long company names', () => {
      render(<CompanyAvatar company="Alpha Beta Gamma Delta" />)
      const avatar = screen.getByRole('img', { name: 'Alpha Beta Gamma Delta' })
      // Capped at 2
      expect(avatar.textContent).toBe('AB')
    })

    it('uppercases the initials', () => {
      render(<CompanyAvatar company="acme corp" />)
      const avatar = screen.getByRole('img', { name: 'acme corp' })
      expect(avatar.textContent).toBe('AC')
    })
  })
})
