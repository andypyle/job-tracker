import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { IconName } from '../Icon/Icon.paths'
import type { badgeVariants } from './Badge.variants'

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Static icon before the label: 12px at small, 16px at medium */
  leadingIcon?: IconName
  /** Static icon after the label: 12px at small, 16px at medium */
  trailingIcon?: IconName
}

export type BadgeAppearance = NonNullable<BadgeProps['appearance']>
