import { cn } from '../../lib/cn'
import type { IconProps } from './Icon.types'
import { iconPaths } from './Icon.paths'

export function Icon({ name, size = 24, label, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn('shrink-0', className)}
      {...props}
    >
      {iconPaths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
