import { cva } from 'class-variance-authority'

// Items sit 20px apart (Figma's item padding), and the content keeps 20px of its own below, so
// the line stops short of the next marker. The last item drops the line and keeps 4px (Position
// Last in Figma), which `last:` handles, so there is no position prop.
export const timelineItemVariants = cva('group/timeline-item flex gap-3 pb-5 last:pb-0', {
  variants: {
    actor: {
      /** A change a person made: text/primary, usually with a status Badge */
      user: 'text-text-primary',
      /** A change the app made on its own (marked Unlikely): text/muted, no badge */
      system: 'text-text-muted',
    },
  },
  defaultVariants: {
    actor: 'user',
  },
})

// 10px, radius-xs: solid brand/default for a person, hollow for the app
export const timelineMarkerVariants = cva('size-2.5 shrink-0 rounded-xs', {
  variants: {
    actor: {
      user: 'bg-brand-default',
      system: 'border-[1.5px] border-border-strong bg-bg-surface',
    },
  },
  defaultVariants: {
    actor: 'user',
  },
})
