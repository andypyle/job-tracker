import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { IconButton } from '../IconButton/IconButton'
import { Input } from './Input'

const meta = {
  title: 'Components/Forms/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Software Engineer',
    'aria-label': 'Job title',
    className: 'w-80',
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

const frameOf = (input: HTMLElement) => input.parentElement!

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Job title' })
    await expect(frameOf(input).getBoundingClientRect().height).toBe(48)
    await userEvent.type(input, 'Staff Engineer')
    await expect(input).toHaveValue('Staff Engineer')
  },
}

export const Focus: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')
    const frame = frameOf(input)
    const restingBorder = getComputedStyle(frame).borderColor
    await userEvent.click(input)
    await expect(input).toHaveFocus()
    // 2px: the 1px border plus a 1px inset ring, both border/focus
    await waitFor(() => expect(getComputedStyle(frame).borderColor).not.toBe(restingBorder))
    await expect(getComputedStyle(frame).boxShadow).toContain('inset')
  },
}

export const Error: Story = {
  args: { 'aria-invalid': true, defaultValue: 'Software Engineer' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')
    await expect(input).toBeInvalid()
    const errorBorder = getComputedStyle(frameOf(input)).borderColor
    // Error stays red while focused
    await userEvent.click(input)
    await expect(getComputedStyle(frameOf(input)).borderColor).toBe(errorBorder)
  },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Software Engineer' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toBeDisabled()
  },
}

export const LeadingIcon: Story = {
  args: { leadingIcon: 'search', placeholder: 'Search applications', 'aria-label': 'Search' },
  play: async ({ canvas, canvasElement }) => {
    // Pressing the icon focuses the input
    await userEvent.click(canvasElement.querySelector('svg')!)
    await expect(canvas.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  },
}

export const Trailing: Story = {
  args: {
    defaultValue: 'Acme',
    'aria-label': 'Company',
    trailing: <IconButton icon="x" label="Clear" className="size-10 text-text-muted" onClick={fn()} />,
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Clear' })
    await expect(button.getBoundingClientRect().width).toBe(40)
    // The button sits 4px inside the border (1px border + pr-1)
    const frame = frameOf(canvas.getByRole('textbox')).getBoundingClientRect()
    await expect(frame.right - button.getBoundingClientRect().right).toBe(5)
  },
}

export const LongValue: Story = {
  args: {
    defaultValue: 'Senior Staff Software Engineer, Developer Platform and Infrastructure',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')
    await expect(getComputedStyle(input).textOverflow).toBe('ellipsis')
  },
}

// Placeholder and filled rows, as in the Figma component set (focus is shown by the play function)
export const States: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(4,20rem)] gap-4">
      <Input {...args} aria-label="Default" />
      <Input {...args} aria-label="Focus" />
      <Input {...args} aria-label="Error" aria-invalid />
      <Input {...args} aria-label="Disabled" disabled />
      <Input {...args} aria-label="Default filled" defaultValue="Software Engineer" />
      <Input {...args} aria-label="Focus filled" defaultValue="Software Engineer" />
      <Input {...args} aria-label="Error filled" defaultValue="Software Engineer" aria-invalid />
      <Input {...args} aria-label="Disabled filled" defaultValue="Software Engineer" disabled />
    </div>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('textbox', { name: 'Focus' }).focus()
  },
}

export const Dark: Story = {
  ...States,
  globals: { theme: 'dark' },
}
