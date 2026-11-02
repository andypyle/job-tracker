import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { PasswordInput } from './PasswordInput'

const meta = {
  title: 'Components/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Password',
    className: 'w-80',
  },
} satisfies Meta<typeof PasswordInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password')
    await expect(input).toHaveAttribute('type', 'password')
    await expect(input).toHaveAttribute('autocomplete', 'current-password')
    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  },
}

export const Toggle: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('Password')
    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await userEvent.type(input, 'hunter22')
    input.setSelectionRange(3, 3)

    await userEvent.click(toggle)
    await expect(input).toHaveAttribute('type', 'text')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    // A mouse press keeps focus and the cursor in the input
    await expect(input).toHaveFocus()
    await expect(input.selectionStart).toBe(3)

    await userEvent.click(toggle)
    await expect(input).toHaveAttribute('type', 'password')
    await expect(input.selectionStart).toBe(3)
  },
}

export const KeyboardToggle: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password')
    await userEvent.click(input)
    await userEvent.keyboard('secret')
    await userEvent.tab()
    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await expect(toggle).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(input).toHaveAttribute('type', 'text')
    await expect(toggle).toHaveFocus()
  },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'secret' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Password')).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Show password' })).toBeDisabled()
  },
}

export const Dark: Story = {
  args: { defaultValue: 'secret' },
  globals: { theme: 'dark' },
}
