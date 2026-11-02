import { cn } from '../../lib/cn'
import type { DescriptionListProps } from './DescriptionList.types'

export { DescriptionListItem } from './parts/DescriptionListItem/DescriptionListItem'

/**
 * A size container, so items switch from stacked to inline by the list's own width (32rem),
 * not the viewport's: the same list works in a narrow card and a wide one.
 */
export function DescriptionList({ className, ...props }: DescriptionListProps) {
  return <dl className={cn('@container flex flex-col', className)} {...props} />
}
