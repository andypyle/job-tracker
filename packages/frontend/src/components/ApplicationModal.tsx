import { useEffect, useRef } from 'react'
import type { Application } from '@jobtracker/shared'
import { ApplicationForm } from './ApplicationForm'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Undefined = create mode; provided = edit mode. */
  application?: Application
  onSuccess: () => void
}

// ─── Focus trap helper ───────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return

    const container = containerRef.current
    if (!container) return

    // Move focus into modal on open
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTORS)
    firstFocusable?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const focusable = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter((el) => !el.closest('[aria-hidden="true"]'))

      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, containerRef])
}

// ─── Escape key handler ──────────────────────────────────────────────────────

function useEscapeKey(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handler()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, enabled])
}

// ─── Modal component ─────────────────────────────────────────────────────────

export function ApplicationModal({
  isOpen,
  onClose,
  application,
  onSuccess,
}: ApplicationModalProps) {
  const isEditMode = Boolean(application)
  const panelRef = useRef<HTMLDivElement>(null)


  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap & Escape key
  useFocusTrap(panelRef, isOpen)
  useEscapeKey(onClose, isOpen)

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    // Close only when clicking the backdrop directly (not the panel)
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-modal-backdrop"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 'var(--z-modal)',
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit Application' : 'Add Application'}
    >
      <div
        ref={panelRef}
        className="bg-white rounded-2xl w-full overflow-hidden animate-modal-panel"
        style={{
          maxWidth: '600px',
          maxHeight: '90vh',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {isEditMode ? 'Edit Application' : 'Add Application'}
          </h2>

          <div className="flex items-center gap-2">

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-100"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5" style={{ overscrollBehavior: 'contain' }}>
          <ApplicationForm
            application={application}
            onSuccess={() => {
              onSuccess()
              onClose()
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}

export default ApplicationModal
