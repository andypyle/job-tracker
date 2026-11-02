import type { HTMLAttributes, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { Tone } from '../../lib/tone'
import type { toastVariants } from './Toast.variants'

/**
 * One toast, as drawn. In the app, call `toast()` and let the Toaster render these; use Toast
 * directly only for previews.
 */
export interface ToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof toastVariants> {
  /**
   * Sets the edge, the icon and the role. `danger` is `role="alert"`; the others are
   * `role="status"`. The title still has to say what happened.
   */
  tone?: Tone
  /** What happened: "Application saved". Title/Base, text/on-band. */
  title: ReactNode
  /** Detail under the title. Body/Small, text/on-band-muted. */
  message?: ReactNode
  /** An optional ghost Button, such as Undo. Its side padding is reduced to 12px here. */
  action?: ReactNode
  /** Shows the dismiss button ("Dismiss notification") and runs when it's pressed */
  onDismiss?: () => void
}
