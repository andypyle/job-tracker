import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { statVariants } from './Stat.variants'

export interface StatProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof statVariants> {
  label: string
  /** A number counts up to its new value when it changes; a string (such as "—") shows as is */
  value: number | string
  sublabel?: string
  /**
   * Shows the skeleton, the same size as the loaded stat: pass the sublabel too to keep its line.
   * The label stays available to screen readers.
   */
  loading?: boolean
  /** Presents a numeric value, such as `(n) => \`${n}%\``. Defaults to `toLocaleString()`. */
  format?: (value: number) => string
}

export type StatEmphasis = NonNullable<StatProps['emphasis']>
