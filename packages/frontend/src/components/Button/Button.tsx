import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import type { AnimatedIconHandlers } from '../AnimatedIcon/AnimatedIcon.types'
import type { ButtonProps } from './Button.types'
import { buttonVariants } from './Button.variants'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    icon,
    type = 'button',
    children,
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
  const handlers = { onClick, onMouseEnter, onMouseLeave, onPointerEnter, onFocus, onBlur }
  const button = (eventHandlers: AnimatedIconHandlers<HTMLButtonElement>, iconNode?: ReactNode) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
      {...eventHandlers}
    >
      {iconNode}
      {children}
    </button>
  )

  if (!icon) return button(handlers)

  // Hovering or focusing the button plays the icon's animation, when it has one
  return <AnimatedIcon<HTMLButtonElement> name={icon} size={20} {...handlers} render={button} />
})
