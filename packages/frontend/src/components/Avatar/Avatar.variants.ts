import { cva } from 'class-variance-authority'

export const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm select-none',
  {
    variants: {
      size: {
        sm: 'size-8',
        md: 'size-10',
        lg: 'size-14',
      },
      /** Set by Avatar from what it can show, not by the caller */
      content: {
        // A photo or logo with a 1px border/subtle edge. avatar/bg shows through transparent logos.
        image: 'border border-border-subtle bg-avatar-bg',
        // Gabarito Bold on avatar/bg
        initials: 'bg-avatar-bg font-display font-bold text-text-primary',
        // The fallback glyph, in text/muted
        icon: 'border border-border-default bg-bg-subtle text-text-muted',
      },
    },
    compoundVariants: [
      // 12/16 at sm and 16/22 at md, as in Figma. Figma keeps lg at 16, which looks small in
      // 56px, so lg uses Heading/H3 (20/28) to keep the initials in step with the box.
      { content: 'initials', size: 'sm', className: 'text-[0.75rem]/4' },
      { content: 'initials', size: 'md', className: 'text-base/[1.375rem]' },
      { content: 'initials', size: 'lg', className: 'text-heading-h3' },
    ],
    defaultVariants: {
      size: 'md',
      content: 'initials',
    },
  },
)

/**
 * Icon size per avatar size. Figma scales the glyph to 14, 18 and 25; lg uses 24 so the
 * 24px grid stays whole and the 2px stroke stays crisp.
 */
export const avatarIconSize = { sm: 14, md: 18, lg: 24 } as const
