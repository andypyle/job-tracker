import { forwardRef, type SyntheticEvent } from 'react'
import { cn } from '../../../../lib/cn'
import { focusRing } from '../../../../lib/classes'
import { Badge } from '../../../Badge/Badge'
import type { BadgeTriggerProps } from './BadgeTrigger.types'

// Inside a clickable row (ApplicationCard), opening the menu must not open the row
function stop(event: SyntheticEvent) {
  event.stopPropagation()
}

/** The compact trigger: a medium Badge with a chevron. 32px to see, 44px to hit. */
export const BadgeTrigger = forwardRef<HTMLButtonElement, BadgeTriggerProps>(function BadgeTrigger(
  { className, label, tone, appearance, onClick, onKeyDown, onPointerDown, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        stop(event)
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        stop(event)
        onKeyDown?.(event)
      }}
      onPointerDown={(event) => {
        stop(event)
        onPointerDown?.(event)
      }}
      className={cn(
        'group relative inline-flex shrink-0 cursor-pointer rounded-sm',
        focusRing,
        'aria-expanded:outline-2 aria-expanded:outline-border-focus',
        'before:absolute before:inset-x-0 before:-inset-y-1.5',
        // Disabled, or busy while a change saves (aria-disabled keeps focus)
        'disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Badge
        size="medium"
        tone={tone}
        appearance={appearance}
        trailingIcon="chevron-down"
        className="group-aria-expanded:[&>svg]:rotate-180 motion-safe:[&>svg]:transition-transform motion-safe:[&>svg]:duration-(--duration-base) motion-safe:[&>svg]:ease-bounce"
      >
        {label}
      </Badge>
    </button>
  )
})
