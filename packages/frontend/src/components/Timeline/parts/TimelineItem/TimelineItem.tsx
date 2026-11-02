import { cn } from '../../../../lib/cn'
import type { TimelineItemProps } from './TimelineItem.types'
import { timelineItemVariants, timelineMarkerVariants } from './TimelineItem.variants'

export function TimelineItem({ className, actor, badge, time, dateTime, children, ...props }: TimelineItemProps) {
  return (
    <li className={cn(timelineItemVariants({ actor }), className)} {...props}>
      {/* The rail: 12px wide, the marker 6px down so it centers on the first 20px line */}
      <div aria-hidden className="flex w-3 shrink-0 flex-col items-center self-stretch pt-1.5">
        <div className={timelineMarkerVariants({ actor })} />
        <div className="w-0.5 flex-1 bg-border-default group-last/timeline-item:hidden" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5 break-words group-last/timeline-item:pb-1">
        <div className="flex items-start gap-2 text-body-small">
          {badge}
          <span className="min-w-0 flex-1">{children}</span>
        </div>
        <time dateTime={dateTime} className="text-caption-regular text-text-muted">
          {time}
        </time>
      </div>
    </li>
  )
}
