import type { DialogHTMLAttributes, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { dialogVariants } from './Dialog.variants'

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'open' | 'role'>,
    VariantProps<typeof dialogVariants> {
  /** Controlled: true opens it as a modal (`showModal()`), false closes it with the exit motion */
  open: boolean
  /**
   * Asks to close: Esc, the close button, or a press on the scrim (not for an alertdialog). Set
   * `open` to false in response. Focus returns to the element that had it before opening.
   */
  onClose: () => void
  /** 400, 560 (default) or 640px from md; a full-width sheet below md */
  size?: 'small' | 'medium' | 'large'
  /**
   * `alertdialog` for confirmations: no close button, and pressing the scrim does nothing. Put
   * `autoFocus` on the safe action (Cancel) so focus starts there.
   */
  role?: 'dialog' | 'alertdialog'
  /** Heading/H2; names the dialog (aria-labelledby) */
  title: ReactNode
  /** Body/Small, text/muted, under the title; describes the dialog (aria-describedby) */
  description?: ReactNode
  /** The buttons: secondary first, primary last. Full width on the sheet. */
  footer?: ReactNode
  /** The body, which scrolls on its own between the header and footer */
  children?: ReactNode
}
