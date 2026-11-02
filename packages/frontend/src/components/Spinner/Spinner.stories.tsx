import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Spinner } from './Spinner'

const meta = {
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  args: {
    label: 'Getting details',
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

/** Small (16px), the default size */
export const Default: Story = {
  args: { size: 'sm' },
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status')
    await expect(status).toHaveTextContent('Getting details')
    await expect(status.querySelector('svg')).toHaveAttribute('width', '16')
  },
}

export const Medium: Story = {
  args: { size: 'md' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status').querySelector('svg')).toHaveAttribute('width', '20')
  },
}

export const CenteredInABox: Story = {
  render: (args) => (
    <div className="flex size-24 rounded-sm border border-border-subtle bg-bg-surface">
      <Spinner {...args} size="md" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const box = canvasElement.querySelector('div')!.getBoundingClientRect()
    const spinner = canvas.getByRole('status').getBoundingClientRect()
    await expect(Math.round(spinner.left - box.left)).toBe(Math.round(box.right - spinner.right))
    await expect(Math.round(spinner.top - box.top)).toBe(Math.round(box.bottom - spinner.bottom))
  },
}

export const Dark: Story = {
  args: { size: 'md' },
  globals: { theme: 'dark' },
}
