import type { HTMLAttributes, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { alertVariants } from './Alert.variants'

/**
 * A message about a whole form or section, above the fields it concerns. Not for field errors
 * (FormField's error) or confirmations after an action (Toast).
 */
export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  /**
   * Sets the fill, edge, icon and role. `danger` (default) is `role="alert"`, announced at once;
   * the others are `role="status"`.
   */
  tone?: 'danger' | 'warning' | 'info' | 'positive'
  /** The message: Body/Base in the tone's on-soft color */
  children: ReactNode
}
