import { cn } from '../../../../lib/cn'
import type { ListItemTitleProps } from './ListItemTitle.types'

// A link in the title stretches over the whole row with ::after (positioned against the <li>),
// which also draws the keyboard focus ring around the row. `static` beats ListItem's rule that
// positions links and buttons, so this one link stays under its own overlay.
const stretchedLink = [
  '[&_a]:static [&_a]:text-inherit [&_a]:outline-none',
  '[&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:rounded-sm [&_a]:after:outline-offset-0',
  '[&_a:focus-visible]:after:outline-2 [&_a:focus-visible]:after:outline-border-focus',
].join(' ')

/** Title/Base in text/primary. Put a router Link inside to make the whole row a link. */
export function ListItemTitle({ className, ...props }: ListItemTitleProps) {
  return (
    <p
      data-list-item-title=""
      className={cn('text-title-base text-text-primary', stretchedLink, className)}
      {...props}
    />
  )
}
