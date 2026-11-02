import { cn } from '../../../../lib/cn'
import { formatLongDate } from '../../../../lib/calendarDate'
import type { DayCellProps } from './DayCell.types'

/** One day in the calendar grid: a gridcell holding a 44px button */
export function DayCell({
  className,
  date,
  selected,
  today,
  outside,
  disabled,
  onClick,
  ...props
}: DayCellProps) {
  return (
    <div role="gridcell" aria-selected={Boolean(selected)}>
      <button
        type="button"
        data-date={date}
        aria-label={formatLongDate(date)}
        aria-current={today ? 'date' : undefined}
        aria-disabled={disabled || undefined}
        onClick={(event) => {
          if (!disabled) onClick?.(event)
        }}
        className={cn(
          'relative flex size-11 cursor-pointer items-center justify-center rounded-sm text-body-base/5 text-text-primary',
          'transition-[background-color] duration-(--duration-fast) ease-out hover:bg-bg-hover',
          // Focus is 2px border/focus inside the cell, drawn over the today border
          'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus',
          today && 'border border-border-strong font-semibold',
          // Figma has text/subtle, which is 2.7:1 on the dark overlay; outside days are still
          // selectable, so they need 4.5:1, and text/muted has it in both modes
          outside && !today && 'text-text-muted',
          selected && 'font-semibold text-text-on-primary',
          disabled && 'cursor-default text-text-subtle line-through hover:bg-transparent',
          className,
        )}
        {...props}
      >
        {/* The fill pops in when the day is chosen; a today border stays visible over it */}
        {selected && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-[inherit] bg-primary-default motion-safe:animate-pop-in"
          />
        )}
        <span className="relative">{Number(date.slice(8))}</span>
      </button>
    </div>
  )
}
