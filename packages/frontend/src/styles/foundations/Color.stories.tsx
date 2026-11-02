import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Code, ModePanels, Page, Swatch } from './parts'
import { colorGroups } from './tokens'

const groupTitles: Record<string, string> = {
  bg: 'Background',
  text: 'Text',
  border: 'Border',
  primary: 'Primary',
  brand: 'Brand',
  accent: 'Accent',
  feedback: 'Feedback',
  avatar: 'Avatar',
  chart: 'Chart',
}

const order = Object.keys(groupTitles)

function ColorPage() {
  // Tone has its own page
  const groups = [...colorGroups(['tone'])].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
  return (
    <Page
      title="Color"
      description={
        <>
          Semantic tokens (Light and Dark modes) alias the primitives. Use these in components, never the
          primitives. Names match Figma: <Code>color/bg/canvas</Code> is <Code>--color-bg-canvas</Code>, so the
          utility is <Code>bg-bg-canvas</Code>.
        </>
      }
    >
      <ModePanels>
        {(mode) =>
          groups.map(([group, tokens]) => (
            <section key={group} className="flex flex-col gap-3">
              <h3 className="text-title-base">{groupTitles[group] ?? group}</h3>
              <div className="flex flex-wrap gap-3">
                {tokens.map((t) => (
                  <Swatch key={t.cssVar} cssVar={t.cssVar} label={t.name} detail={t[mode]} />
                ))}
              </div>
            </section>
          ))
        }
      </ModePanels>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Color',
  component: ColorPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ColorPage>

export default meta

export const Color: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    // Every semantic token resolves in both panels, and the dark panel really is dark
    const [light, dark] = canvasElement.querySelectorAll<HTMLElement>('[style*="color-scheme"]')
    await expect(getComputedStyle(light).backgroundColor).toBe('rgb(238, 242, 239)') // pine/100
    await expect(getComputedStyle(dark).backgroundColor).toBe('rgb(7, 26, 23)') // pine/975
    for (const swatch of canvasElement.querySelectorAll<HTMLElement>('figure > div')) {
      await expect(getComputedStyle(swatch).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    }
  },
}
