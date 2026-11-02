import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Textarea } from './Textarea'

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Anything you want to remember about this role',
    'aria-label': 'Notes',
    className: 'w-80',
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox', { name: 'Notes' })
    await expect(textarea.getBoundingClientRect().height).toBe(96)
    await expect(getComputedStyle(textarea).resize).toBe('none')
  },
}

export const Grows: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox')
    await userEvent.type(textarea, 'one{Enter}two{Enter}three{Enter}four')
    // 4 lines: 4 × 24 + 24px padding + 2px border
    await expect(textarea.getBoundingClientRect().height).toBe(122)
    await userEvent.type(textarea, '{Enter}5{Enter}6{Enter}7{Enter}8{Enter}9{Enter}10')
    // Stops at max-h-56, then scrolls
    await expect(textarea.getBoundingClientRect().height).toBe(224)
    await expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight)
  },
}

export const Focus: Story = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox')
    await userEvent.click(textarea)
    await expect(getComputedStyle(textarea).boxShadow).toContain('inset')
  },
}

export const Error: Story = {
  args: { 'aria-invalid': true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toBeInvalid()
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toBeDisabled()
  },
}

export const States: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(2,20rem)] gap-4">
      <Textarea {...args} aria-label="Default" />
      <Textarea {...args} aria-label="Default filled" defaultValue="Anything you want to remember about this role" />
      <Textarea {...args} aria-label="Focus" />
      <Textarea {...args} aria-label="Focus filled" defaultValue="Anything you want to remember about this role" />
      <Textarea {...args} aria-label="Error" aria-invalid />
      <Textarea {...args} aria-label="Error filled" aria-invalid defaultValue="Anything you want to remember about this role" />
      <Textarea {...args} aria-label="Disabled" disabled />
      <Textarea {...args} aria-label="Disabled filled" disabled defaultValue="Anything you want to remember about this role" />
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
