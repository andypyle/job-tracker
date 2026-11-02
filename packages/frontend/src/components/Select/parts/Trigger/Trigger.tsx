import { forwardRef } from 'react'
import { cn } from '../../../../lib/cn'
import { fieldFrame } from '../../../../lib/classes'
import { Icon } from '../../../Icon/Icon'
import type { TriggerProps } from './Trigger.types'

/** The field trigger: looks like Input, with a chevron that flips while the menu is open */
export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function Trigger(
  { className, placeholder, valueLabel, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'group flex h-12 w-full cursor-pointer items-center gap-2 pr-3 pl-4 text-left outline-none',
        fieldFrame,
        'enabled:hover:bg-bg-hover',
        // Focus and open are 2px border/focus; error wins, so the problem stays visible
        'not-aria-invalid:focus:border-border-focus not-aria-invalid:focus:inset-ring-1 not-aria-invalid:focus:inset-ring-border-focus',
        'not-aria-invalid:aria-expanded:border-border-focus not-aria-invalid:aria-expanded:inset-ring-1 not-aria-invalid:aria-expanded:inset-ring-border-focus',
        'aria-invalid:border-feedback-error-strong aria-invalid:inset-ring-1 aria-invalid:inset-ring-feedback-error-strong',
        'disabled:cursor-default disabled:border-border-default disabled:bg-bg-subtle disabled:text-text-subtle',
        className,
      )}
      {...props}
    >
      {valueLabel ? (
        // Keyed by the label, so a new value mounts and fades in over duration/fast
        <span
          key={valueLabel}
          className="min-w-0 flex-1 truncate transition-opacity duration-(--duration-fast) ease-out starting:opacity-0"
        >
          {valueLabel}
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-text-muted group-disabled:text-text-subtle">
          {placeholder}
        </span>
      )}
      {/* Reduced motion: the chevron flips without rotating */}
      <Icon
        name="chevron-down"
        size={20}
        className="group-aria-expanded:rotate-180 motion-safe:transition-transform motion-safe:duration-(--duration-base) motion-safe:ease-bounce"
      />
    </button>
  )
})
