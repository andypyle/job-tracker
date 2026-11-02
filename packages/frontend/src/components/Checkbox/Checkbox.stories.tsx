import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    label: 'This was a referral',
    onChange: fn(),
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const checkbox = canvas.getByRole('checkbox', { name: 'This was a referral' })
    // The whole row is the target, at least 44px tall
    const row = checkbox.closest('label')!
    await expect(row.getBoundingClientRect().height).toBe(44)
    await userEvent.click(canvas.getByText('This was a referral'))
    await expect(checkbox).toBeChecked()
    await expect(args.onChange).toHaveBeenCalledOnce()
    await userEvent.click(row)
    await expect(checkbox).not.toBeChecked()
  },
}

export const WithDescription: Story = {
  args: { description: 'Someone at the company passed your name along.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAccessibleDescription(
      'Someone at the company passed your name along.',
    )
  },
}

export const KeyboardFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    const checkbox = canvas.getByRole('checkbox')
    await expect(checkbox).toHaveFocus()
    // The ring is on the 24px slot next to the hidden input
    const slot = checkbox.nextElementSibling!
    await expect(getComputedStyle(slot).outlineWidth).toBe('2px')
    await userEvent.keyboard(' ')
    await expect(checkbox).toBeChecked()
  },
}

export const Error: Story = {
  args: {
    description: 'Someone at the company passed your name along.',
    error: 'Confirm this before saving',
  },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox')
    await expect(checkbox).toBeInvalid()
    // The error replaces the description, so it's never shown by color alone
    await expect(checkbox).toHaveAccessibleDescription('Confirm this before saving')
    await expect(canvas.queryByText('Someone at the company passed your name along.')).toBeNull()
  },
}

export const Indeterminate: Story = {
  args: { indeterminate: true, label: 'Select all' },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole<HTMLInputElement>('checkbox')
    await expect(checkbox.indeterminate).toBe(true)
    await expect(checkbox).toBePartiallyChecked()
    await userEvent.click(checkbox)
    await expect(checkbox.indeterminate).toBe(false)
    await expect(checkbox).toBeChecked()
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    const checkbox = canvas.getByRole('checkbox')
    await userEvent.click(canvas.getByText('This was a referral'))
    await expect(checkbox).not.toBeChecked()
    await expect(args.onChange).not.toHaveBeenCalled()
  },
}

// The Figma matrix: unchecked, checked and indeterminate across default, focus, error and
// disabled (hover needs a real pointer, so it isn't shown)
export const States: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(4,max-content)] gap-x-8">
      {(['unchecked', 'checked', 'indeterminate'] as const).map((value) => {
        const shared = {
          ...args,
          defaultChecked: value === 'checked',
          indeterminate: value === 'indeterminate',
        }
        return [
          <Checkbox key={`${value}-default`} {...shared} />,
          <Checkbox key={`${value}-focus`} {...shared} data-focus={value} />,
          <Checkbox key={`${value}-error`} {...shared} aria-invalid />,
          <Checkbox key={`${value}-disabled`} {...shared} disabled />,
        ]
      })}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Show the keyboard ring on the focus column
    for (const input of canvasElement.querySelectorAll<HTMLInputElement>('[data-focus]')) {
      input.nextElementSibling!.classList.add('outline-2', 'outline-border-focus')
    }
  },
}

export const Example: Story = {
  render: () => (
    <div className="flex w-[22rem] flex-col">
      <Checkbox label="This was a referral" description="Someone at the company passed your name along." />
      <Checkbox label="Remote" defaultChecked />
      <Checkbox label="Follow up" description="Remind me in a week." indeterminate />
    </div>
  ),
}

export const Dark: Story = {
  ...States,
  globals: { theme: 'dark' },
}
