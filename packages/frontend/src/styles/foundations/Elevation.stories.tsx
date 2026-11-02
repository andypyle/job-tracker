import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Code, ModePanels, Page } from './parts'

const layers = [
  { label: 'bg/canvas', className: 'bg-bg-canvas border border-border-subtle' },
  { label: 'bg/surface · flat', className: 'bg-bg-surface' },
  { label: 'bg/overlay · shadow-overlay', className: 'bg-bg-overlay shadow-overlay' },
]

function ElevationPage() {
  return (
    <Page
      title="Elevation"
      description={
        <>
          Flat by default: separation comes from color steps, not shadows. One shadow,{' '}
          <Code>shadow-overlay</Code>, for things that float (menus, popovers, dialogs, toasts). In dark mode,
          lightness does the work: canvas, then surface, then overlay.
        </>
      }
    >
      <ModePanels>
        {() => (
          <div className="flex flex-wrap gap-6">
            {layers.map((l) => (
              <div
                key={l.label}
                data-layer={l.label}
                className={`flex h-28 w-36 items-end rounded-sm p-3 text-caption-medium ${l.className}`}
              >
                {l.label}
              </div>
            ))}
          </div>
        )}
      </ModePanels>
    </Page>
  )
}

const meta = {
  title: 'Foundations/Elevation',
  component: ElevationPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ElevationPage>

export default meta

export const Elevation: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const overlays = canvasElement.querySelectorAll<HTMLElement>('[data-layer^="bg/overlay"]')
    for (const el of overlays) await expect(getComputedStyle(el).boxShadow).not.toBe('none')
  },
}
