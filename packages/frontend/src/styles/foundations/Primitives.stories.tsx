import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Page, Section, Swatch } from './parts'
import { primitives } from './tokens'

function PrimitivesPage() {
  return (
    <Page
      title="Primitives"
      description="Raw values, hidden from publishing. Pine is both the brand color and the tinted neutral. They live on :root only, so they don't generate utilities: reach them through the semantic tokens."
    >
      {primitives.map(({ family, steps }) => (
        <Section key={family} title={family}>
          <div className="flex flex-wrap gap-3">
            {steps.map((p) => (
              <Swatch
                key={p.cssVar}
                cssVar={p.cssVar}
                label={p.name.split('/')[1] ?? p.name}
                detail={p.value}
              />
            ))}
          </div>
        </Section>
      ))}
    </Page>
  )
}

const meta = {
  title: 'Foundations/Primitives',
  component: PrimitivesPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PrimitivesPage>

export default meta

export const Primitives: StoryObj<typeof meta> = {
  play: async () => {
    const pine = primitives.find((p) => p.family === 'pine')!
    await expect(pine.steps.map((s) => s.name.split('/')[1])).toEqual([
      '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '975',
    ])
  },
}
