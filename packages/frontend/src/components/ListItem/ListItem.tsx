import { cn } from '../../lib/cn'
import type { ListItemProps } from './ListItem.types'
import { listItemVariants } from './ListItem.variants'

export { ListItemText } from './parts/ListItemText/ListItemText'
export { ListItemTitle } from './parts/ListItemTitle/ListItemTitle'

export function ListItem({ className, selected, enter, ...props }: ListItemProps) {
  return <li className={cn(listItemVariants({ selected, enter }), className)} {...props} />
}
