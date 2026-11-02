import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { AvatarProps } from './Avatar.types'
import { avatarIconSize, avatarVariants } from './Avatar.variants'

export function Avatar({
  className,
  size = 'md',
  src,
  initials,
  icon = 'briefcase',
  alt,
  ...props
}: AvatarProps) {
  // Remember which src failed, so a new src gets a fresh try
  const [failedSrc, setFailedSrc] = useState<string>()

  const text = initials?.trim()
  const content = src && src !== failedSrc ? 'image' : text ? 'initials' : 'icon'
  const labelled = Boolean(alt)

  return (
    <span
      // The image carries its own alt; initials and the icon need the name on the wrapper
      {...(content !== 'image' &&
        (labelled ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true }))}
      data-content={content}
      className={cn(avatarVariants({ size, content }), className)}
      {...props}
    >
      {content === 'image' && (
        <img
          src={src ?? undefined}
          alt={alt ?? ''}
          onError={() => setFailedSrc(src ?? undefined)}
          className="size-full object-cover"
        />
      )}
      {content === 'initials' && text}
      {content === 'icon' && <Icon name={icon} size={avatarIconSize[size ?? 'md']} />}
    </span>
  )
}
