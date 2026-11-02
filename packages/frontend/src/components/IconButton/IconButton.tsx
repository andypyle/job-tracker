import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { colorTransition, focusRing } from '../../lib/classes'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import type { IconButtonProps } from './IconButton.types'

// Inherits its text color, so it works on the pine band and on toasts
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    icon,
    label,
    active,
    type = 'button',
    onClick,
    onMouseEnter,
    onMouseLeave,
    onPointerEnter,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  return (
    <AnimatedIcon<HTMLButtonElement>
      name={icon}
      size={20}
      active={active}
      {...{ onClick, onMouseEnter, onMouseLeave, onPointerEnter, onFocus, onBlur }}
      render={(handlers, iconNode) => (
        <button
          ref={ref}
          type={type}
          aria-label={label}
          className={cn(
            'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-bg-subtle',
            colorTransition,
            focusRing,
            'disabled:pointer-events-none disabled:text-text-subtle',
            className,
          )}
          {...props}
          {...handlers}
        >
          {iconNode}
        </button>
      )}
    />
  )
})
