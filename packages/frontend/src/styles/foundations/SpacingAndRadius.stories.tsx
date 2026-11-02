import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Code, Page, Section } from './parts'
import { tokensWithPrefix } from './tokens'

const steps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
const radii = [...tokensWithPrefix('--radius-'), { name: 'full', cssVar: '', value: '9999px' }]

function SpacingAndRadiusPage() {
  return (
    <Page
      title="Spacing and radius"
      description={
        <>
          Spacing is <Code>calc(var(--spacing) * n)</Code> on a 4px base, the same steps as Tailwind (
          <Code>p-4</Code> = 16px). <Code>rounded-sm</Code> (4px) is the default for nearly everything;{' '}
          <Code>rounded-md</Code> for dialogs and panels. No pills.
        </>
      }
    >
      <div className="grid gap-12 md:grid-cols-2">
        <Section title="Spacing">
          <ul className="flex flex-col gap-2">
            {steps.map((n) => (
              <li key={n} className="grid grid-cols-[9rem_1fr] items-center gap-4">
                <span className="text-caption-medium">
                  spacing/{n} · {n * 4}px
                </span>
                <span
                  data-step={n}
                  className="h-3 rounded-xs bg-brand-default"
                  style={{ width: `calc(var(--spacing) * ${n})` }}
                />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Radius">
          <ul className="flex flex-wrap gap-4">
            {radii.map((r) => (
              <li key={r.name} className="flex flex-col gap-1.5">
                <span
                  className="size-16 border border-border-default bg-bg-subtle"
                  style={{ borderRadius: r.cssVar ? `var(${r.cssVar})` : r.value }}
                />
                <span className="text-caption-medium">
                  {r.name} · {r.cssVar ? `${parseFloat(r.value) * 16}px` : 'full'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Spacing and radius',
  component: SpacingAndRadiusPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SpacingAndRadiusPage>

export default meta

export const SpacingAndRadius: StoryObj<typeof meta> = {
  name: 'Spacing and radius',
  play: async ({ canvasElement }) => {
    for (const n of steps) {
      const bar = canvasElement.querySelector<HTMLElement>(`[data-step="${n}"]`)!
      await expect(bar.getBoundingClientRect().width).toBe(n * 4)
    }
  },
}
