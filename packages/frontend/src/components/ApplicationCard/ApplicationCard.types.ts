import type { Application } from '@jobtracker/shared'
import type { ListItemProps } from '../ListItem/ListItem.types'
import type { StatusSelectProps } from '../StatusSelect/StatusSelect.types'

/** One application in a list: a ListItem (`<li>`), so render it inside a `<ul>`. */
export interface ApplicationCardProps extends Omit<ListItemProps, 'children'> {
  application: Application
  /** Saves a new status; see StatusSelect's `onChange` (return `mutateAsync` to show it busy) */
  onStatusChange: StatusSelectProps['onChange']
  /** Where the row links. Defaults to the application's detail page. */
  to?: string
}
