import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { focusRing } from '../../lib/classes'
import { IconButton } from '../IconButton/IconButton'
import type { DialogProps } from './Dialog.types'
import { dialogVariants } from './Dialog.variants'

/**
 * A native `<dialog>` opened with `showModal()`, which brings the top layer, the focus trap, an
 * inert page, Esc and `::backdrop` (the scrim). Closing is controlled: Esc and the close button
 * call `onClose`, and the dialog closes when `open` turns false.
 */
export function Dialog({
  className,
  open,
  onClose,
  size,
  role = 'dialog',
  title,
  description,
  footer,
  children,
  ...props
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const body = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const alert = role === 'alertdialog'

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      setScrolled(false)
      el.showModal()
      // showModal focuses an `autofocus` element, else the first focusable (the close button).
      // React never renders `autofocus` (its autoFocus runs at mount, while this is still
      // closed), so content marks its starting point with data-autofocus instead.
      el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  // A body that scrolls must be reachable by keyboard, so it's a tab stop while it overflows
  useEffect(() => {
    const el = body.current
    if (!el || !open) return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [open, children])

  return (
    <dialog
      ref={dialog}
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(dialogVariants({ size }), className)}
      // Esc: keep it open until the parent says so, so the exit motion runs through `open`
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // A press on the scrim lands on the dialog element itself, outside the panel's content
      onClick={(event) => {
        if (!alert && event.target === event.currentTarget) onClose()
      }}
      {...props}
    >
      {/* Header: a divider appears under it once the body scrolls */}
      <div
        className={cn(
          'flex shrink-0 items-start gap-4 border-b pt-5 pr-3 pb-[calc(--spacing(4)-1px)] pl-6 transition-colors duration-(--duration-fast)',
          scrolled ? 'border-border-divider' : 'border-transparent',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
          <h2 id={titleId} className="font-display text-heading-h2">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-body-small text-text-muted">
              {description}
            </p>
          )}
        </div>
        {!alert && <IconButton icon="x" label="Close" onClick={onClose} />}
      </div>

      {/* A confirmation may have no body: then the header sits straight on the footer */}
      {children != null && children !== false && (
        <div
          ref={body}
          data-dialog-body=""
          tabIndex={overflows ? 0 : undefined}
          className={cn(focusRing, 'min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6 -outline-offset-2')}
          onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
        >
          {children}
        </div>
      )}

      {footer && (
        <div
          className={cn(
            'flex shrink-0 items-center justify-end gap-3 border-t border-border-divider px-6 py-4',
            // Full-width buttons on the sheet only
            size !== 'small' && 'max-md:[&>*]:flex-1',
          )}
        >
          {footer}
        </div>
      )}
    </dialog>
  )
}
