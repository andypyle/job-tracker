import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Input } from '../Input/Input'
import { PasswordInput } from '../PasswordInput/PasswordInput'
import { Textarea } from '../Textarea/Textarea'
import { FormField } from './FormField'

const meta = {
  title: 'Components/Forms/FormField',
  component: FormField,
  tags: ['autodocs'],
  args: {
    label: 'Job title',
    className: 'w-80',
    children: <Input placeholder="Software Engineer" />,
  },
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    // A real <label for>: clicking it focuses the control
    await userEvent.click(canvas.getByText('Job title'))
    await expect(canvas.getByRole('textbox', { name: 'Job title' })).toHaveFocus()
  },
}

export const OptionalWithHint: Story = {
  args: {
    label: 'Job link',
    optional: true,
    hint: 'Paste a link to fill in the title, company and logo.',
    children: <Input type="url" placeholder="https://" />,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: /Job link/ })
    await expect(canvas.getByText('Optional')).toBeVisible()
    await expect(input).toHaveAccessibleDescription(
      'Paste a link to fill in the title, company and logo.',
    )
    await expect(input).toBeValid()
  },
}

export const Error: Story = {
  args: {
    hint: 'As it appears in the posting.',
    error: 'Job title is required',
    children: <Input defaultValue="Software Engineer" />,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Job title' })
    await expect(input).toBeInvalid()
    // The error replaces the hint
    await expect(input).toHaveAccessibleDescription('Job title is required')
    await expect(canvas.queryByText('As it appears in the posting.')).toBeNull()
  },
}

export const WithTextarea: Story = {
  args: {
    label: 'Notes',
    optional: true,
    children: <Textarea placeholder="Anything you want to remember about this role" />,
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Notes'))
    await expect(canvas.getByRole('textbox', { name: /Notes/ })).toHaveFocus()
  },
}

export const WithPasswordInput: Story = {
  args: {
    label: 'Password',
    error: 'Use at least 8 characters',
    children: <PasswordInput autoComplete="new-password" defaultValue="short" />,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password')
    await expect(input).toBeInvalid()
    await expect(input).toHaveAccessibleDescription('Use at least 8 characters')
  },
}

export const States: Story = {
  render: (args) => (
    <div className="flex items-start gap-6">
      <FormField {...args}>
        <Input placeholder="Software Engineer" />
      </FormField>
      <FormField {...args} error="Job title is required">
        <Input defaultValue="Software Engineer" />
      </FormField>
    </div>
  ),
}

export const Dark: Story = {
  ...States,
  globals: { theme: 'dark' },
}
