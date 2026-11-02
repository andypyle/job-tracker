import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Button } from './Button'

const variants = ['primary', 'strong', 'secondary', 'ghost', 'danger'] as const

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Add application',
    icon: 'plus',
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: variants },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Primary, the default variant */
export const Default: Story = {
  args: { variant: 'primary' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add application' })
    await expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

export const Strong: Story = { args: { variant: 'strong' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Danger: Story = { args: { variant: 'danger', icon: undefined, children: 'Delete application' } }

export const AnimatedIcon: Story = {
  args: { variant: 'secondary', icon: 'edit', children: 'Edit' },
  play: async ({ args, canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-useanimations]')).not.toBeNull())
    const button = canvas.getByRole('button', { name: 'Edit' })
    await userEvent.hover(button)
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledOnce()
    await expect(button.getBoundingClientRect().height).toBe(44)
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button')
    await expect(button).toBeDisabled()
    await userEvent.click(button, { pointerEventsCheck: 0 })
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

export const KeyboardFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    const button = canvas.getByRole('button')
    await expect(button).toHaveFocus()
    await expect(getComputedStyle(button).outlineStyle).toBe('solid')
    await expect(getComputedStyle(button).outlineWidth).toBe('2px')
  },
}

const matrix = (args: Story['args']) => (
  <div className="grid grid-cols-[repeat(2,max-content)] gap-3">
    {variants.map((variant) => [
      <Button key={variant} {...args} variant={variant} />,
      <Button key={`${variant}-disabled`} {...args} variant={variant} disabled />,
    ])}
  </div>
)

export const AllVariants: Story = {
  render: matrix,
  play: async ({ canvas }) => {
    for (const button of canvas.getAllByRole('button')) {
      await expect(button.getBoundingClientRect().height).toBe(44)
    }
  },
}

export const AllVariantsDark: Story = {
  render: matrix,
  globals: { theme: 'dark' },
}
