import type { HTMLAttributes, ReactNode } from 'react'

export interface DescriptionListItemProps extends HTMLAttributes<HTMLDivElement> {
  /** The term (`<dt>`): Label/Small in text/muted */
  label: ReactNode
  /**
   * The value (`<dd>`): Body/Base in text/primary, or a link, file or Badge. Empty (null,
   * undefined, false or '') shows "Not set" in text/muted, never a blank cell.
   */
  children?: ReactNode
}
