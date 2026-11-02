import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Code, Page } from './parts'

const heading = 'Know where every application stands'
const body = 'Paste a job link and we’ll fill in the title, company and logo.'

// Literal class names, so Tailwind generates them and this page checks the real utilities
const styles = [
  { name: 'Display/Hero', utility: 'font-display text-display-hero', spec: 'Gabarito Bold · 60/64', sample: heading },
  { name: 'Display/Stat', utility: 'font-display text-display-stat', spec: 'Gabarito Bold · 48/48', sample: heading },
  { name: 'Heading/H1', utility: 'font-display text-heading-h1', spec: 'Gabarito Bold · 36/40', sample: heading },
  { name: 'Heading/H2', utility: 'font-display text-heading-h2', spec: 'Gabarito Bold · 24/32', sample: heading },
  { name: 'Heading/H3', utility: 'font-display text-heading-h3', spec: 'Gabarito Bold · 20/28', sample: body },
  { name: 'Body/Large', utility: 'text-body-large', spec: 'Atkinson Hyperlegible Next Regular · 18/28', sample: body },
  { name: 'Body/Base', utility: 'text-body-base', spec: 'Atkinson Hyperlegible Next Regular · 16/24', sample: body },
  { name: 'Title/Base', utility: 'text-title-base', spec: 'Atkinson Hyperlegible Next SemiBold · 16/22', sample: body },
  { name: 'Label/Base', utility: 'text-label-base', spec: 'Atkinson Hyperlegible Next SemiBold · 16/20', sample: body },
  { name: 'Body/Small', utility: 'text-body-small', spec: 'Atkinson Hyperlegible Next Regular · 14/20', sample: body },
  { name: 'Label/Small', utility: 'text-label-small', spec: 'Atkinson Hyperlegible Next Medium · 14/20', sample: body },
  { name: 'Caption/Regular', utility: 'text-caption-regular', spec: 'Atkinson Hyperlegible Next Regular · 12/16', sample: body },
  { name: 'Caption/Medium', utility: 'text-caption-medium', spec: 'Atkinson Hyperlegible Next Medium · 12/16', sample: body },
  { name: 'Caption/Bold', utility: 'text-caption-bold', spec: 'Atkinson Hyperlegible Next Bold · 12/16', sample: body },
]

function TypographyPage() {
  return (
    <Page
      title="Typography"
      description={
        <>
          Gabarito Bold for headings and big numbers; Atkinson Hyperlegible Next for everything else. Each
          Figma text style is one utility. Headings and display styles add <Code>font-display</Code>; everything
          else uses the default body font.
        </>
      }
    >
      <div className="flex flex-col divide-y divide-border-subtle">
        {styles.map((s) => (
          <div key={s.name} className="grid grid-cols-[17rem_1fr] items-baseline gap-6 py-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-label-small">{s.name}</span>
              <span className="text-caption-regular text-text-muted">{s.spec}</span>
              <Code>{s.utility}</Code>
            </div>
            <p data-style={s.name} className={s.utility}>
              {s.sample}
            </p>
          </div>
        ))}
      </div>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Typography',
  component: TypographyPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TypographyPage>

export default meta

export const Typography: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    await document.fonts.ready
    await expect(document.fonts.check('700 36px "Gabarito"')).toBe(true)
    await expect(document.fonts.check('400 16px "Atkinson Hyperlegible Next Variable"')).toBe(true)
    // Each sample's computed size and line height match its spec
    for (const s of styles) {
      const el = canvasElement.querySelector<HTMLElement>(`[data-style="${s.name}"]`)!
      const [size, lineHeight] = s.spec.split(' · ')[1].split('/')
      await expect(getComputedStyle(el).fontSize, s.name).toBe(`${size}px`)
      await expect(getComputedStyle(el).lineHeight, s.name).toBe(`${lineHeight}px`)
    }
  },
}
