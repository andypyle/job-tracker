import type { HTMLAttributes, ReactNode } from 'react'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** What is missing: "No applications yet". Heading/H2. */
  title: ReactNode
  /** Heading level for the page outline. Defaults to h2; the look is always Heading/H2. */
  titleAs?: 'h1' | 'h2' | 'h3'
  /** What to do about it, in at most 2 lines (it wraps at 320px). Body/Base, text/muted. */
  description?: ReactNode
  /** The one way forward: a Primary Button, or a link styled as one */
  action?: ReactNode
}
