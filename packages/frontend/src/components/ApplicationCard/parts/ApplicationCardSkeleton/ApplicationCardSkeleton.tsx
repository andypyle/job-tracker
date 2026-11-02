import { cn } from '../../../../lib/cn'
import type { ApplicationCardSkeletonProps } from './ApplicationCardSkeleton.types'

/**
 * A loading row, 88px as in Figma. It's hidden from screen readers: set `aria-busy` on the
 * list and announce the loading there.
 */
export function ApplicationCardSkeleton({ className, ...props }: ApplicationCardSkeletonProps) {
  return (
    <li aria-hidden="true" className={cn('flex items-center gap-4 rounded-sm bg-bg-surface p-4', className)} {...props}>
      <div className="flex min-w-0 flex-1 items-center gap-4 animate-pulse-opacity">
        <div className="size-10 shrink-0 rounded-sm bg-bg-skeleton" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-4 w-60 max-w-full rounded-xs bg-bg-skeleton" />
          <div className="h-3 w-37.5 max-w-full rounded-xs bg-bg-skeleton" />
          <div className="h-3 w-25 max-w-full rounded-xs bg-bg-skeleton" />
        </div>
        <div className="h-5 w-20 shrink-0 rounded-xs bg-bg-skeleton" />
      </div>
    </li>
  )
}
