import type { LiHTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { listItemVariants } from './ListItem.variants'

/**
 * The row is a layout: its children sit side by side, 16px apart. Typically a leading Avatar,
 * Swatch or icon; a ListItemText with a ListItemTitle and further lines; and trailing content
 * such as a Badge, a Select BadgeTrigger or a Button.
 */
export interface ListItemProps
  extends LiHTMLAttributes<HTMLLIElement>,
    VariantProps<typeof listItemVariants> {
  /**
   * The current row: bg/nav-active and the brand rail. If the title is a link, give the link
   * `aria-current` as well.
   */
  selected?: boolean
  /**
   * Rises into place when it mounts. Set it on rows added after the list first rendered, so a
   * page load doesn't animate every row.
   */
  enter?: boolean
}
