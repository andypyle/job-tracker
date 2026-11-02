import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../Button/Button'
import { Toast } from './Toast'

const meta = {
  title: 'Components/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: {
    title: 'Application saved',
    message: 'Senior Product Designer · Northwind Labs',
    onDismiss: fn(),
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'info', 'warning', 'positive', 'danger'] },
    action: { control: false },
  },
  // 400px, as in Figma. In the app the Toaster renders these; see Toaster for the stack.
  decorators: [
    (Story) => (
      <div className="flex w-100 flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toast>

export default meta
type Story = StoryObj<typeof meta>

/** Neutral: pine surface in either theme, 80px, a 4px edge and a dismiss button */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    const toast = canvas.getByRole('status')
    const style = getComputedStyle(toast)
    await expect(style.height).toBe('80px')
    await expect(style.borderLeftWidth).toBe('4px')
    await expect(style.colorScheme).toBe('dark')

    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notification' }))
    await expect(args.onDismiss).toHaveBeenCalledOnce()
  },
}

/** Tone sets the edge and icon; danger is role="alert" */
export const AllTones: Story = {
  render: (args) => (
    <>
      <Toast {...args} tone="neutral" />
      <Toast {...args} tone="info" title="Details fetched" message="From jobs.northwindlabs.com" />
      <Toast {...args} tone="warning" title="Logo not found" message="Showing initials instead" />
      <Toast {...args} tone="positive" title="Moved to Interviewing" message={undefined} />
      <Toast {...args} tone="danger" title="Couldn’t save the application" message="Check your connection and try again" />
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('status')).toHaveLength(4)
    await expect(canvas.getAllByRole('alert')).toHaveLength(1)
  },
}

/** With a ghost action such as Undo */
export const WithAction: Story = {
  args: {
    tone: 'positive',
    title: 'Application deleted',
    message: undefined,
    action: <Button variant="ghost">Undo</Button>,
  },
  play: async ({ canvas }) => {
    const toast = canvas.getByRole('status').getBoundingClientRect()
    const undo = canvas.getByRole('button', { name: 'Undo' })
    const dismiss = canvas.getByRole('button', { name: 'Dismiss notification' })
    await expect(undo).toBeVisible()
    await expect(getComputedStyle(canvas.getByRole('status')).height).toBe('80px')

    // Even gaps: text to Undo, and Undo's label to the × glyph, are both 24px
    const range = document.createRange()
    range.selectNodeContents(undo)
    const label = range.getBoundingClientRect()
    const glyph = (dismiss.querySelector('svg') as SVGElement).getBoundingClientRect()
    const text = canvas.getByText('Application deleted').parentElement!.getBoundingClientRect()
    await expect(Math.round(label.left - text.right)).toBe(24)
    await expect(Math.round(glyph.left - label.right)).toBe(24)
    // The × sits as far from the right edge as from the top: 5px to the target, 17px to the glyph
    const target = dismiss.getBoundingClientRect()
    await expect(Math.round(toast.right - target.right)).toBe(5)
    await expect(Math.round(target.top - toast.top)).toBe(5)
    await expect(Math.round(toast.right - glyph.right)).toBe(Math.round(glyph.top - toast.top))
    // Both targets center on the title line
    const title = canvas.getByText('Application deleted').getBoundingClientRect()
    const center = (rect: DOMRect) => rect.top + rect.height / 2
    await expect(Math.round(center(undo.getBoundingClientRect()))).toBe(Math.round(center(title)))
    await expect(Math.round(center(dismiss.getBoundingClientRect()))).toBe(Math.round(center(title)))
  },
}

/** The same pine surface on a dark page */
export const Dark: Story = {
  ...AllTones,
  globals: { theme: 'dark' },
}
