import { cva } from 'class-variance-authority'

// 40px across from md (16px below), with the back link, then the title row, 12px apart
export const pageHeaderVariants = cva('flex flex-col items-start gap-3 px-4 md:px-10', {
  variants: {
    appearance: {
      /** The signature field for top-level and detail pages: bg/header (white with a hairline in light mode, pine in dark) */
      // The hairline takes 1px of the bottom padding, so the band is Figma's 134px
      band: 'border-b border-border-header bg-bg-header pt-8 pb-[calc(--spacing(8)-1px)]',
      /** No fill, for nested views and settings */
      plain: 'pt-6 pb-4',
    },
  },
  defaultVariants: {
    appearance: 'band',
  },
})
