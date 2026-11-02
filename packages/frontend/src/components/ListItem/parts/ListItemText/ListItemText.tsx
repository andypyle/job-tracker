import { cn } from '../../../../lib/cn'
import type { ListItemTextProps } from './ListItemText.types'

/**
 * The text column: fills the row, lines 2px apart. Lines are Body/Small in text/muted unless
 * they say otherwise (a ListItemTitle, or `text-caption-regular` for a small meta line).
 */
export function ListItemText({ className, ...props }: ListItemTextProps) {
  return (
    <div
      data-list-item-text=""
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5 text-body-small break-words text-text-muted',
        className,
      )}
      {...props}
    />
  )
}
