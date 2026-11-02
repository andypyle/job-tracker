import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { Badge } from '../Badge/Badge'
import type { NavItemProps } from './NavItem.types'
import { navItemVariants } from './NavItem.variants'

export function NavItem({
  className,
  level,
  icon,
  count,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onPointerEnter,
  onFocus,
  onBlur,
  ...props
}: NavItemProps) {
  const handlers = { onClick, onMouseEnter, onMouseLeave, onPointerEnter, onFocus, onBlur }

  return (
    <AnimatedIcon<HTMLAnchorElement>
      name={icon}
      size={level === 'sub' ? 16 : 20}
      // text/muted, or text/nav-active with the label when active
      className="text-text-muted group-aria-[current=page]/nav-item:text-inherit"
      {...handlers}
      render={(eventHandlers, iconNode) => (
        <NavLink className={cn(navItemVariants({ level }), className)} {...props} {...eventHandlers}>
          {iconNode}
          <span className="min-w-0 flex-1 truncate">{children}</span>
          {count !== undefined && (
            <Badge tone="neutral" appearance="soft">
              {count}
            </Badge>
          )}
        </NavLink>
      )}
    />
  )
}
