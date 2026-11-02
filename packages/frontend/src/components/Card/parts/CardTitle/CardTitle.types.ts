import type { HTMLAttributes } from 'react'

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level for the page outline. Defaults to h2; the look is always Heading/H3. */
  as?: 'h2' | 'h3' | 'h4'
}
