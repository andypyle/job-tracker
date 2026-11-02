import { cva } from 'class-variance-authority'
import { colorTransition, focusRing } from '../../lib/classes'

// radius-sm, Label/Small in text/primary, bg/hover on hover. Active (NavLink sets
// aria-current="page"): bg/nav-active, text/nav-active and a 3px brand/default rail, so it's
// marked by shape as well as color. The rail takes 3px of the left padding, so nothing moves.
export const navItemVariants = cva(
  [
    'group/nav-item flex items-center rounded-sm text-label-small text-text-primary',
    colorTransition,
    focusRing,
    'not-aria-[current=page]:hover:bg-bg-hover',
    'aria-[current=page]:border-l-3 aria-[current=page]:border-brand-default aria-[current=page]:bg-bg-nav-active aria-[current=page]:text-text-nav-active',
  ],
  {
    variants: {
      level: {
        /** 44px: 12px padding, a 20px icon 12px from the label */
        top: 'gap-3 p-3 aria-[current=page]:pl-[calc(--spacing(3)-3px)]',
        /** 48px with its count: indented 32px, a 16px icon 10px from the label */
        sub: 'gap-2.5 py-3 pr-3 pl-8 aria-[current=page]:pl-[calc(--spacing(8)-3px)]',
      },
    },
    defaultVariants: {
      level: 'top',
    },
  },
)
