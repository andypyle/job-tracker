import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Button } from '../../components/Button/Button'
import { Code, Page, Section } from './parts'
import { tokensWithPrefix } from './tokens'

const usage: Record<string, string> = {
  fast: 'Exits, color and hover changes',
  base: 'Menus, popovers, checkbox',
  slow: 'Dialogs opening, chart bars, month slide',
  slower: 'Toasts entering and their FLIP reflow',
  bounce: 'Enters only: a small overshoot (about 6%), then settle',
  out: 'Non-bouncy enters, color fades',
  in: 'Exits. Never bounce on the way out',
}

const durations = tokensWithPrefix('--duration-')
const easings = tokensWithPrefix('--ease-')

function MotionPage() {
  const [played, setPlayed] = useState(false)
  return (
    <Page
      title="Motion"
      description={
        <>
          Enters get a little bounce. Exits never bounce. Color changes never bounce. Reduced motion: opacity
          only. Durations are <Code>duration-(--duration-fast)</Code> and so on; easings are{' '}
          <Code>ease-bounce</Code>, <Code>ease-out</Code> and <Code>ease-in</Code>.
        </>
      }
    >
      <Section title="Duration">
        <table className="text-left">
          <tbody className="divide-y divide-border-subtle">
            {durations.map((d) => (
              <tr key={d.name}>
                <th scope="row" className="py-3 pr-8 text-label-small">
                  duration/{d.name}
                </th>
                <td className="py-3 pr-8 text-body-small">{d.value}</td>
                <td className="py-3 text-body-small text-text-muted">{usage[d.name]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Easing">
        <div>
          <Button variant="secondary" onClick={() => setPlayed(!played)}>
            {played ? 'Play back' : 'Play'}
          </Button>
        </div>
        <table className="text-left">
          <tbody className="divide-y divide-border-subtle">
            {easings.map((e) => (
              <tr key={e.name}>
                <th scope="row" className="py-3 pr-8 text-label-small">
                  ease/{e.name}
                </th>
                <td className="py-3 pr-8 font-mono text-caption-regular">{e.value}</td>
                <td className="py-3 pr-8 text-body-small text-text-muted">{usage[e.name]}</td>
                <td className="w-64 py-3">
                  <div className="relative h-6 rounded-sm bg-bg-subtle">
                    <span
                      data-ease={e.name}
                      className="absolute top-1 left-1 size-4 rounded-xs bg-brand-default motion-safe:transition-transform motion-reduce:transition-opacity"
                      style={{
                        transitionDuration: 'var(--duration-slow)',
                        transitionTimingFunction: `var(${e.cssVar})`,
                        transform: played ? 'translateX(13.5rem)' : 'none',
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Motion',
  component: MotionPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MotionPage>

export default meta

export const Motion: StoryObj<typeof meta> = {
  play: async ({ canvas, canvasElement }) => {
    await expect(durations.map((d) => d.value)).toEqual(['120ms', '200ms', '280ms', '400ms'])
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }))
    const dot = canvasElement.querySelector<HTMLElement>('[data-ease="bounce"]')!
    await expect(dot.style.transform).toBe('translateX(13.5rem)')
  },
}
