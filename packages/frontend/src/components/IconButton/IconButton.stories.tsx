import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { IconButton } from './IconButton'

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    icon: 'x',
    label: 'Close',
    onClick: fn(),
    className: 'text-text-primary',
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' })
    await expect(button.getBoundingClientRect().width).toBe(44)
    await expect(button.getBoundingClientRect().height).toBe(44)
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

export const KeyboardFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    const button = canvas.getByRole('button')
    await expect(button).toHaveFocus()
    await expect(getComputedStyle(button).outlineWidth).toBe('2px')
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toBeDisabled()
  },
}

export const Toggle: Story = {
  args: { icon: 'eye', label: 'Show password', 'aria-pressed': false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}

export const OnBand: Story = {
  args: { className: undefined },
  render: (args) => (
    <div className="flex items-center gap-3 rounded-sm bg-bg-band p-4 text-text-on-band [color-scheme:dark]">
      <span className="text-label-small">Moved to Interviewing</span>
      <IconButton {...args} />
    </div>
  ),
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}
