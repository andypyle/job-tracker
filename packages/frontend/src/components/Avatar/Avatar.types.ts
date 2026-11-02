import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { IconName } from '../Icon/Icon.paths'
import type { avatarVariants } from './Avatar.variants'

export interface AvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>,
    Omit<VariantProps<typeof avatarVariants>, 'content'> {
  /** Photo or logo. Missing or broken images fall back to the initials, then the icon. */
  src?: string | null
  /** Up to two characters; `getInitials(name)` from `src/lib/initials.ts` derives them */
  initials?: string
  /** Glyph shown when there's no image and no initials. Defaults to briefcase. */
  icon?: IconName
  /**
   * Accessible name, kept whichever content shows (for example "Acme logo"). Leave it out when
   * the name is shown next to the avatar: the avatar is then decorative and hidden.
   */
  alt?: string
}

export type AvatarSize = NonNullable<AvatarProps['size']>
