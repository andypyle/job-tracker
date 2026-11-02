import { cva } from 'class-variance-authority'

// bg/surface on the canvas, radius-sm, no shadow and no border: the color step separates it
export const cardVariants = cva('flex flex-col overflow-clip rounded-sm bg-bg-surface text-text-primary', {
  variants: {
    padding: {
      /** 24px all round; the body sits 16px under the header */
      default: 'gap-4 p-6',
      /** The header pads itself above a divider; the body runs edge to edge (lists, tables) */
      flush: '',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
})
