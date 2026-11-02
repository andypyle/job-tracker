import { cn } from '../../lib/cn'
import type { EmptyStateProps } from './EmptyState.types'

/**
 * Centered in the content area: the title, the description 4px below, the action 16px below
 * that, with 96px above and below. No decorative icon.
 */
export function EmptyState({ className, title, titleAs: Title = 'h2', description, action, ...props }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 px-6 py-24 text-center', className)} {...props}>
      <div className="flex flex-col items-center gap-1">
        <Title className="font-display text-heading-h2 text-balance text-text-primary">{title}</Title>
        {description && <p className="max-w-80 text-body-base text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
