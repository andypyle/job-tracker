import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Code, ModePanels, Page } from './parts'
import { colorTokens } from './tokens'

const tones = ['neutral', 'info', 'warning', 'positive', 'danger'] as const
const roles = ['accent', 'solid', 'on-solid', 'soft', 'on-soft'] as const

const token = (tone: string, role: string) => colorTokens.find((t) => t.name === `tone/${tone}-${role}`)

function TonePage() {
  return (
    <Page
      title="Tone"
      description={
        <>
          One vocabulary for feedback and status across Badge, Swatch, Stat, Toast and Select: neutral, info,
          warning, positive, danger. Each tone has five roles: <Code>accent</Code> for edges and icons,{' '}
          <Code>solid</Code> with <Code>on-solid</Code> text, and <Code>soft</Code> with <Code>on-soft</Code>{' '}
          text.
        </>
      }
    >
      <ModePanels>
        {(mode) => (
          <table className="border-separate border-spacing-2 text-left">
            <thead>
              <tr>
                <td />
                {roles.map((role) => (
                  <th key={role} scope="col" className="text-caption-medium text-text-muted">
                    {role}
                  </th>
                ))}
                <th scope="col" className="text-caption-medium text-text-muted">
                  in use
                </th>
              </tr>
            </thead>
            <tbody>
              {tones.map((tone) => (
                <tr key={tone}>
                  <th scope="row" className="pr-2 text-caption-medium">
                    {tone}
                  </th>
                  {roles.map((role) => {
                    const t = token(tone, role)!
                    return (
                      <td key={role} title={`${t.name} · ${t[mode]}`}>
                        <div
                          className="h-8 w-14 rounded-sm border border-border-subtle"
                          style={{ background: `var(${t.cssVar})` }}
                        />
                      </td>
                    )
                  })}
                  <td>
                    <div className="flex gap-1.5">
                      <span
                        className="rounded-sm px-2 py-0.5 text-caption-medium"
                        style={{
                          background: `var(--color-tone-${tone}-solid)`,
                          color: `var(--color-tone-${tone}-on-solid)`,
                        }}
                      >
                        Solid
                      </span>
                      <span
                        className="rounded-sm px-2 py-0.5 text-caption-medium"
                        style={{
                          background: `var(--color-tone-${tone}-soft)`,
                          color: `var(--color-tone-${tone}-on-soft)`,
                        }}
                      >
                        Soft
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModePanels>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Tone',
  component: TonePage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TonePage>

export default meta

export const Tone: StoryObj<typeof meta> = {
  play: async () => {
    for (const tone of tones) {
      for (const role of roles) {
        await expect(token(tone, role), `tone/${tone}-${role}`).toBeDefined()
      }
    }
  },
}
