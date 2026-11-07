import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { ResetPasswordScreen, type ResetPasswordScreenProps } from './ResetPasswordPage'

const meta = {
  title: 'Screens/Reset password',
  component: ResetPasswordScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    token: 'reset-token-from-the-email',
    onReset: fn<ResetPasswordScreenProps['onReset']>(async () => 'reset'),
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ResetPasswordScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument()
    await expect(canvas.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    await expect(canvas.getByLabelText('Confirm new password')).toHaveAttribute('autocomplete', 'new-password')
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
  },
}

/** Sends the token and the new password, then says it's done and points to sign in */
export const Resets: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('New password'), 'correct-horse-battery')
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'correct-horse-battery')
    await userEvent.click(canvas.getByRole('button', { name: 'Set new password' }))
    await waitFor(() =>
      expect(args.onReset).toHaveBeenCalledWith('reset-token-from-the-email', 'correct-horse-battery'),
    )

    const heading = await canvas.findByRole('heading', { level: 1, name: 'Password changed' })
    await waitFor(() => expect(heading).toHaveFocus())
    await expect(canvas.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login')
  },
}

/** Too short and not matching: field errors, and nothing is sent */
export const Invalid: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('New password'), 'short')
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'other')
    await userEvent.click(canvas.getByRole('button', { name: 'Set new password' }))
    await expect(await canvas.findByText('Use at least 8 characters.', { selector: '[id]' })).toBeVisible()
    await expect(canvas.getByText('Passwords don’t match.')).toBeVisible()
    await expect(args.onReset).not.toHaveBeenCalled()
  },
}

/** A link that's used or expired by the time the form is sent: offer a new one */
export const ExpiredOnSubmit: Story = {
  args: { onReset: fn<ResetPasswordScreenProps['onReset']>(async () => 'invalid-token') },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('New password'), 'correct-horse-battery')
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'correct-horse-battery')
    await userEvent.click(canvas.getByRole('button', { name: 'Set new password' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'This link has expired' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Send a new link' })).toHaveAttribute('href', '/forgot-password')
  },
}

/** Opened from a used or expired link (no token): straight to the way to get a new one */
export const ExpiredLink: Story = {
  args: { token: undefined },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'This link has expired' })).toBeVisible()
    await expect(canvas.getByText(/Reset links work once, for an hour/)).toBeVisible()
    await expect(canvas.queryByLabelText('New password')).not.toBeInTheDocument()
    await expect(args.onReset).not.toHaveBeenCalled()
  },
}

/** Any other failure: a danger Alert, which takes focus; the form stays to try again */
export const ResetFailed: Story = {
  args: { onReset: fn<ResetPasswordScreenProps['onReset']>(async () => Promise.reject(new Error('Network Error'))) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('New password'), 'correct-horse-battery')
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'correct-horse-battery')
    await userEvent.click(canvas.getByRole('button', { name: 'Set new password' }))
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('Network Error')
    await waitFor(() => expect(alert).toHaveFocus())
    await expect(canvas.getByRole('button', { name: 'Set new password' })).toBeEnabled()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

export const ExpiredLinkDark: Story = {
  ...ExpiredLink,
  globals: { theme: 'dark' },
}

export const ResetsDark: Story = {
  ...Resets,
  globals: { theme: 'dark' },
}
