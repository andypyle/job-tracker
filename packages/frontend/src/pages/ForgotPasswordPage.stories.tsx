import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { ForgotPasswordScreen } from './ForgotPasswordPage'

const meta = {
  title: 'Screens/Forgot password',
  component: ForgotPasswordScreen,
  parameters: { layout: 'fullscreen' },
  args: { onRequest: fn(async () => {}) },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ForgotPasswordScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument()
    await expect(canvas.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    await expect(canvas.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
  },
}

/** Sends the trimmed email, then says to check it without saying whether the account exists */
export const SendsLink: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Email'), '  alex@example.com ')
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(args.onRequest).toHaveBeenCalledWith('alex@example.com'))

    const heading = await canvas.findByRole('heading', { level: 1, name: 'Check your email' })
    await waitFor(() => expect(heading).toHaveFocus())
    await expect(canvas.getByText(/If there’s an account for/)).toHaveTextContent(
      'If there’s an account for alex@example.com, we’ve sent it a link to choose a new password. The link works for an hour.',
    )
    await expect(canvas.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  },
}

export const Required: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(canvas.getByLabelText('Email')).toHaveFocus())
    await expect(canvas.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email')

    await userEvent.type(canvas.getByLabelText('Email'), 'alex@')
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() =>
      expect(canvas.getByLabelText('Email')).toHaveAccessibleDescription('Enter an email like name@example.com'),
    )
    await expect(args.onRequest).not.toHaveBeenCalled()
  },
}

/** A failure (here, the demo's address) shows a danger Alert, which takes focus; the email stays */
export const RequestFailed: Story = {
  args: {
    onRequest: fn(async () =>
      Promise.reject(new Error('The demo account’s password can’t be changed. Use Try the demo on the sign-in page.')),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Email'), 'demo@example.com')
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('The demo account’s password can’t be changed.')
    await waitFor(() => expect(alert).toHaveFocus())
    await expect(canvas.getByLabelText('Email')).toHaveValue('demo@example.com')
  },
}

/** While sending, the button says so and can't be pressed twice */
export const Pending: Story = {
  args: { onRequest: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    await expect(await canvas.findByRole('button', { name: 'Sending…' })).toBeDisabled()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

export const SendsLinkDark: Story = {
  ...SendsLink,
  globals: { theme: 'dark' },
}

export const RequestFailedDark: Story = {
  ...RequestFailed,
  globals: { theme: 'dark' },
}
