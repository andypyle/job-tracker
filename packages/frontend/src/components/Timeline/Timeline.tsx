import { cn } from '../../lib/cn'
import type { TimelineProps } from './Timeline.types'

export { TimelineItem } from './parts/TimelineItem/TimelineItem'

/** An `<ol>` of TimelineItems, newest first */
export function Timeline({ className, ...props }: TimelineProps) {
  return <ol className={cn('flex flex-col', className)} {...props} />
}
