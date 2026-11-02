import { forwardRef } from 'react'
import { cn } from '../../../../lib/cn'
import { popoverMotion, popoverSurface } from '../../../../lib/classes'
import type { MenuProps } from './Menu.types'

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      role="listbox"
      popover="manual"
      className={cn(
        popoverSurface,
        'max-h-80 overflow-y-auto overscroll-contain p-1',
        popoverMotion,
        className,
      )}
      {...props}
    />
  )
})
