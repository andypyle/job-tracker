import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

// A visual check of tokens.css against the Figma Foundations page, in both modes.

const textStyles = [
  { name: 'Display/Hero', className: 'font-display text-display-hero' },
  { name: 'Display/Stat', className: 'font-display text-display-stat' },
  { name: 'Heading/H1', className: 'font-display text-heading-h1' },
  { name: 'Heading/H2', className: 'font-display text-heading-h2' },
  { name: 'Heading/H3', className: 'font-display text-heading-h3' },
  { name: 'Body/Large', className: 'text-body-large' },
  { name: 'Body/Base', className: 'text-body-base' },
  { name: 'Body/Small', className: 'text-body-small' },
  { name: 'Title/Base', className: 'text-title-base' },
  { name: 'Label/Base', className: 'text-label-base' },
  { name: 'Label/Small', className: 'text-label-small' },
  { name: 'Caption/Regular', className: 'text-caption-regular' },
  { name: 'Caption/Medium', className: 'text-caption-medium' },
  { name: 'Caption/Bold', className: 'text-caption-bold' },
]

const surfaces = [
  { name: 'bg/canvas', className: 'bg-bg-canvas' },
  { name: 'bg/surface', className: 'bg-bg-surface' },
  { name: 'bg/overlay', className: 'bg-bg-overlay' },
  { name: 'bg/subtle', className: 'bg-bg-subtle' },
  { name: 'bg/header', className: 'bg-bg-header' },
  { name: 'bg/band', className: 'bg-bg-band' },
  { name: 'primary/default', className: 'bg-primary-default' },
  { name: 'brand/default', className: 'bg-brand-default' },
]

const tones = ['neutral', 'info', 'warning', 'positive', 'danger'] as const

// Literal class names so Tailwind can find them
const toneClasses: Record<(typeof tones)[number], { solid: string; soft: string; accent: string }> = {
  neutral: {
    solid: 'bg-tone-neutral-solid text-tone-neutral-on-solid',
    soft: 'bg-tone-neutral-soft text-tone-neutral-on-soft',
    accent: 'bg-tone-neutral-accent',
  },
  info: {
    solid: 'bg-tone-info-solid text-tone-info-on-solid',
    soft: 'bg-tone-info-soft text-tone-info-on-soft',
    accent: 'bg-tone-info-accent',
  },
  warning: {
    solid: 'bg-tone-warning-solid text-tone-warning-on-solid',
    soft: 'bg-tone-warning-soft text-tone-warning-on-soft',
    accent: 'bg-tone-warning-accent',
  },
  positive: {
    solid: 'bg-tone-positive-solid text-tone-positive-on-solid',
    soft: 'bg-tone-positive-soft text-tone-positive-on-soft',
    accent: 'bg-tone-positive-accent',
  },
  danger: {
    solid: 'bg-tone-danger-solid text-tone-danger-on-solid',
    soft: 'bg-tone-danger-soft text-tone-danger-on-soft',
    accent: 'bg-tone-danger-accent',
  },
}

function Foundations() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-heading-h2">Text styles</h2>
        {textStyles.map((s) => (
          <div key={s.name} className="flex items-baseline gap-6">
            <span className="w-32 shrink-0 text-caption-regular text-text-muted">{s.name}</span>
            <span className={s.className}>Know where every application stands</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-heading-h2">Surfaces</h2>
        <div className="flex flex-wrap gap-4">
          {surfaces.map((s) => (
            <div key={s.name} className="flex flex-col gap-2">
              <div className={`size-20 rounded-sm border border-border-subtle ${s.className}`} />
              <span className="text-caption-regular text-text-muted">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-heading-h2">Tones</h2>
        <div className="flex flex-wrap gap-4">
          {tones.map((tone) => (
            <div key={tone} className="flex flex-col gap-2">
              <span className={`rounded-sm px-2 py-1 text-label-small ${toneClasses[tone].solid}`}>
                {tone} solid
              </span>
              <span className={`rounded-sm px-2 py-1 text-label-small ${toneClasses[tone].soft}`}>
                {tone} soft
              </span>
              <span className={`h-1 rounded-xs ${toneClasses[tone].accent}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-heading-h2">Elevation</h2>
        <div className="flex gap-4 bg-bg-canvas p-6">
          <div className="size-24 rounded-sm bg-bg-surface p-2 text-caption-regular">surface</div>
          <div className="size-24 rounded-sm bg-bg-overlay p-2 text-caption-regular shadow-overlay">
            overlay
          </div>
        </div>
      </section>
    </div>
  )
}

const meta = {
  title: 'Foundations/Tokens',
  component: Foundations,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Foundations>

export default meta
type Story = StoryObj<typeof meta>

const fontsLoaded = async () => {
  await document.fonts.ready
  await expect(document.fonts.check('700 36px "Gabarito"')).toBe(true)
  await expect(document.fonts.check('400 16px "Atkinson Hyperlegible Next Variable"')).toBe(true)
}

export const Light: Story = {
  play: async () => {
    await fontsLoaded()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await fontsLoaded()
    // color/bg/canvas resolves to pine/975 in dark
    await expect(getComputedStyle(canvasElement.ownerDocument.body).backgroundColor).toBe(
      'rgb(7, 26, 23)',
    )
  },
}
