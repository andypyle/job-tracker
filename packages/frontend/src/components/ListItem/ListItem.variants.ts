import { cva } from 'class-variance-authority'

// bg/surface, radius-sm, no shadow, 20px across, children 16px apart. Figma's row is 80px with
// 16px padding, but its three lines of text (62px) spill into that padding, so the row is a min
// height with the content centered: the same 80px with all three lines, and room to grow.
export const listItemVariants = cva(
  [
    // Below md, 12px apart with 16/12px sides, as in the Jobs: Mobile frame
    'relative flex min-h-20 items-center gap-4 rounded-sm px-5 py-2 max-md:gap-3 max-md:pr-3 max-md:pl-4',
    'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-out',
    // A link in the ListItemTitle covers the row. Controls are positioned so they paint above
    // it and stay clickable (:where keeps this weaker than the title link's own `static`).
    '[&_:where(a,button,input,select,textarea,[tabindex])]:relative',
    // Hover, only when the row is a link: 1px border/strong, as an inset ring so nothing shifts
    'has-[[data-list-item-title]_a]:hover:inset-ring-1 has-[[data-list-item-title]_a]:hover:inset-ring-border-strong',
  ],
  {
    variants: {
      selected: {
        // bg/nav-active and a 3px brand/default rail, which takes 3px of the padding so the
        // content doesn't move. text/muted on bg/nav-active is 3.4:1 in Dark mode, so the text
        // column turns text/primary (deviation from Figma); size and weight still set lines apart.
        true: 'border-l-3 border-brand-default bg-bg-nav-active pl-[calc(--spacing(5)-3px)] max-md:pl-[calc(--spacing(4)-3px)] [&_[data-list-item-text]]:text-text-primary',
        false: 'bg-bg-surface',
      },
      enter: {
        true: 'animate-rise-in motion-reduce:[--rise:0px]',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
      enter: false,
    },
  },
)
