import type { HTMLAttributes, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { pageHeaderVariants } from './PageHeader.variants'

export interface PageHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'>,
    VariantProps<typeof pageHeaderVariants> {
  /** `band` (default) for top-level and detail pages, `plain` for nested views */
  appearance?: 'band' | 'plain'
  /** The page's only h1: Heading/H1, Heading/H2 below md */
  title: ReactNode
  /** Body/Base, text/muted, 6px under the title */
  description?: ReactNode
  /** A ghost link with a left arrow above the title, e.g. `{ to: '/jobs', label: 'Back to jobs' }` */
  back?: { to: string; label: string }
  /**
   * Up to two Buttons (a Secondary, then at most one Primary per page), 12px apart. Bottom-aligned
   * beside the title from md, under it below md.
   */
  actions?: ReactNode
}
