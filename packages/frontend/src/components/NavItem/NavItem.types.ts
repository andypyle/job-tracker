import type { ReactNode } from 'react'
import type { NavLinkProps } from 'react-router-dom'
import type { VariantProps } from 'class-variance-authority'
import type { IconName } from '../Icon/Icon.paths'
import type { navItemVariants } from './NavItem.variants'

/**
 * A sidebar link: a react-router NavLink, so the active state (and `aria-current="page"`) comes
 * from the route. Pass `end` for links whose children routes shouldn't mark them active.
 */
export interface NavItemProps
  extends Omit<NavLinkProps, 'className' | 'children' | 'style'>,
    VariantProps<typeof navItemVariants> {
  /** `top` (default) for sections, `sub` for the links under one */
  level?: 'top' | 'sub'
  /** Leading icon: 20px at top level, 16px at sub. Animates on hover when it has an animation. */
  icon: IconName
  /** The label */
  children: ReactNode
  /** A count after the label (sub level), as a neutral soft Badge */
  count?: number
  className?: string
}
