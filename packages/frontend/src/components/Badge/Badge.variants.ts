import { cva } from 'class-variance-authority'

// color/tone/{tone}/{solid, on-solid, soft, on-soft}. Outline draws its border and text in on-soft.
const toneAppearance = {
  neutral: {
    solid: 'bg-tone-neutral-solid text-tone-neutral-on-solid',
    soft: 'bg-tone-neutral-soft text-tone-neutral-on-soft',
    outline: 'border-tone-neutral-on-soft text-tone-neutral-on-soft',
  },
  info: {
    solid: 'bg-tone-info-solid text-tone-info-on-solid',
    soft: 'bg-tone-info-soft text-tone-info-on-soft',
    outline: 'border-tone-info-on-soft text-tone-info-on-soft',
  },
  warning: {
    solid: 'bg-tone-warning-solid text-tone-warning-on-solid',
    soft: 'bg-tone-warning-soft text-tone-warning-on-soft',
    outline: 'border-tone-warning-on-soft text-tone-warning-on-soft',
  },
  positive: {
    solid: 'bg-tone-positive-solid text-tone-positive-on-solid',
    soft: 'bg-tone-positive-soft text-tone-positive-on-soft',
    outline: 'border-tone-positive-on-soft text-tone-positive-on-soft',
  },
  danger: {
    solid: 'bg-tone-danger-solid text-tone-danger-on-solid',
    soft: 'bg-tone-danger-soft text-tone-danger-on-soft',
    outline: 'border-tone-danger-on-soft text-tone-danger-on-soft',
  },
} as const

type BadgeTone = keyof typeof toneAppearance
type BadgeAppearance = keyof (typeof toneAppearance)[BadgeTone]

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-sm whitespace-nowrap',
  {
    variants: {
      tone: { neutral: '', info: '', warning: '', positive: '', danger: '' },
      appearance: { solid: '', soft: '', outline: 'border' },
      size: {
        /** 24px, Caption/Medium */
        small: 'h-6 px-2 text-caption-medium',
        /** 32px, Label/Small */
        medium: 'h-8 px-3 text-label-small',
      },
    },
    compoundVariants: Object.entries(toneAppearance).flatMap(([tone, appearances]) =>
      Object.entries(appearances).map(([appearance, className]) => ({
        tone: tone as BadgeTone,
        appearance: appearance as BadgeAppearance,
        className,
      })),
    ),
    defaultVariants: {
      tone: 'neutral',
      appearance: 'solid',
      size: 'small',
    },
  },
)
