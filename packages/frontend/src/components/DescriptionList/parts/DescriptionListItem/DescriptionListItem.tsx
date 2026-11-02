import { cn } from '../../../../lib/cn'
import type { DescriptionListItemProps } from './DescriptionListItem.types'

export function DescriptionListItem({ className, label, children, ...props }: DescriptionListItemProps) {
  const empty = children == null || children === false || children === ''

  return (
    <div
      className={cn(
        // Stacked: label above value, 4px apart. 12px above and below, with the 1px
        // border/subtle divider inside the bottom padding as in Figma (stacked 72px, inline 48px).
        // The last item has no divider (the ApplicationDetail/Details pattern).
        'flex flex-col gap-1 border-b border-border-subtle pt-3 pb-[calc(--spacing(3)-1px)] break-words last:border-b-0 last:pb-3',
        // Inline once the list is 32rem wide: a 160px label column, baselines aligned
        '@lg:flex-row @lg:items-baseline @lg:gap-4',
        className,
      )}
      {...props}
    >
      <dt className="text-label-small text-text-muted @lg:w-40 @lg:shrink-0">{label}</dt>
      <dd className={cn('min-w-0 flex-1 text-body-base', empty ? 'text-text-muted' : 'text-text-primary')}>
        {empty ? 'Not set' : children}
      </dd>
    </div>
  )
}
