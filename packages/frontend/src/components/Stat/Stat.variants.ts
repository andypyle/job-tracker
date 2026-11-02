import { cva } from 'class-variance-authority'
import type { Tone } from '../../lib/tone'

// Subtle: bg/surface, and non-neutral tones add a 4px top rule in color/tone/{tone}/accent.
// The rule sits inside the padding (16px below md, 20px from md), as Figma strokes do, so the
// text doesn't move.
// Strong: the solid tone block in on-solid; neutral is the pine band, pinned to Dark mode.
const toneEmphasis = {
  neutral: {
    subtle: '',
    strong: 'bg-bg-band [color-scheme:dark] text-text-on-band',
  },
  info: {
    subtle: 'border-t-4 border-tone-info-accent pt-3 md:pt-4',
    strong: 'bg-tone-info-solid text-tone-info-on-solid',
  },
  warning: {
    subtle: 'border-t-4 border-tone-warning-accent pt-3 md:pt-4',
    strong: 'bg-tone-warning-solid text-tone-warning-on-solid',
  },
  positive: {
    subtle: 'border-t-4 border-tone-positive-accent pt-3 md:pt-4',
    strong: 'bg-tone-positive-solid text-tone-positive-on-solid',
  },
  danger: {
    subtle: 'border-t-4 border-tone-danger-accent pt-3 md:pt-4',
    strong: 'bg-tone-danger-solid text-tone-danger-on-solid',
  },
} as const

type StatEmphasis = keyof (typeof toneEmphasis)[Tone]

export const statVariants = cva('flex flex-col gap-1 rounded-sm p-4 md:p-5', {
  variants: {
    tone: { neutral: '', info: '', warning: '', positive: '', danger: '' },
    emphasis: {
      subtle: 'bg-bg-surface text-text-primary',
      strong: '',
    },
  },
  compoundVariants: Object.entries(toneEmphasis).flatMap(([tone, emphases]) =>
    Object.entries(emphases).map(([emphasis, className]) => ({
      tone: tone as Tone,
      emphasis: emphasis as StatEmphasis,
      className,
    })),
  ),
  defaultVariants: {
    tone: 'neutral',
    emphasis: 'subtle',
  },
})

/**
 * Text colors inside the stat. Subtle mutes the label and sublabel; tone-strong blocks keep
 * on-solid throughout; the pine block has muted on-band text and a chartreuse value.
 */
export function statTextColors(tone: Tone, emphasis: StatEmphasis) {
  if (emphasis === 'subtle') return { muted: 'text-text-muted', value: 'text-text-primary' }
  if (tone === 'neutral') return { muted: 'text-text-on-band-muted', value: 'text-accent-chartreuse' }
  return { muted: '', value: '' }
}
