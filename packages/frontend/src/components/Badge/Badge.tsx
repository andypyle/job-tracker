import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { BadgeProps } from './Badge.types'
import { badgeVariants } from './Badge.variants'

export function Badge({
  className,
  tone,
  appearance,
  size,
  leadingIcon,
  trailingIcon,
  children,
  ...props
}: BadgeProps) {
  const iconSize = size === 'medium' ? 16 : 12

  return (
    <span className={cn(badgeVariants({ tone, appearance, size }), className)} {...props}>
      {leadingIcon && <Icon name={leadingIcon} size={iconSize} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </span>
  )
}
