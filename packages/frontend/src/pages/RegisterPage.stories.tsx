import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { SignUpScreen, type SignUpResult } from './RegisterPage'

const meta = {
  title: 'Screens/Sign up',
  component: SignUpScreen,
  parameters: { layout: 'fullscreen' },
  args: { onSignUp: fn(async (): Promise<SignUpResult> => 'signed-in') },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof SignUpScreen>

export default meta
type Story = StoryObj<typeof meta>

const emailTaken = 'There’s already an account with this email. Sign in instead?'

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
    await expect(canvas.getByLabelText('Name')).toHaveAttribute('autocomplete', 'name')
    await expect(canvas.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    await expect(canvas.getByLabelText('Password')).toHaveAccessibleDescription('Use at least 8 characters.')
    await expect(canvas.getByLabelText('Confirm password')).toHaveAttribute('autocomplete', 'new-password')
    await expect(canvas.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  },
}

/** Signs up with the trimmed name and email and the password as typed */
export const SignsUp: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Name'), ' Alex Rivera ')
    await userEvent.type(canvas.getByLabelText('Email'), ' alex@example.com ')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'correct horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(args.onSignUp).toHaveBeenCalledWith('Alex Rivera', 'alex@example.com', 'correct horse'))
  },
}

/** Errors show on blur, and the error replaces the password hint */
export const ErrorsOnBlur: Story = {
  play: async ({ canvas }) => {
    const name = canvas.getByLabelText('Name')
    await userEvent.click(name)
    await userEvent.tab()
    await waitFor(() => expect(name).toHaveAccessibleDescription('Enter your name'))
    await expect(name).toHaveAttribute('aria-invalid', 'true')

    const password = canvas.getByLabelText('Password')
    await userEvent.type(password, 'short')
    await userEvent.tab()
    await waitFor(() => expect(password).toHaveAccessibleDescription('Use at least 8 characters.'))
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    // Fields never left stay quiet
    await expect(canvas.getByLabelText('Confirm password')).not.toHaveAttribute('aria-invalid', 'true')
  },
}

/** Submitting an empty form marks every field and focuses the first */
export const Required: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(canvas.getByLabelText('Name')).toHaveFocus())
    await expect(canvas.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email')
    await expect(canvas.getByLabelText('Password')).toHaveAccessibleDescription('Enter a password')
    await expect(canvas.getByLabelText('Confirm password')).toHaveAccessibleDescription('Enter your password again')
    await expect(args.onSignUp).not.toHaveBeenCalled()
  },
}

/** The match check follows the password once the confirm field has been left */
export const PasswordsDontMatch: Story = {
  play: async ({ canvas }) => {
    const password = canvas.getByLabelText('Password')
    const confirm = canvas.getByLabelText('Confirm password')
    await userEvent.type(password, 'correct horse')
    await userEvent.type(confirm, 'correct hors')
    await userEvent.tab()
    await waitFor(() => expect(confirm).toHaveAccessibleDescription('Passwords don’t match.'))

    // Fixing the password, not the confirmation, clears it
    await userEvent.type(password, '{Backspace}')
    await waitFor(() => expect(confirm).not.toHaveAttribute('aria-invalid', 'true'))
  },
}

/**
 * Figma's Sign up error: the email is already registered (a field error, which takes focus)
 * and the passwords don't match.
 */
export const SignUpError: Story = {
  args: { onSignUp: fn(async () => 'email-taken' as const) },
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Alex Rivera')
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'correct horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))

    const email = canvas.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveFocus())
    await expect(email).toHaveAccessibleDescription(emailTaken)
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    const confirm = canvas.getByLabelText('Confirm password')
    await userEvent.type(confirm, '{Backspace}{Backspace}{Backspace}')
    await userEvent.tab()
    await waitFor(() => expect(confirm).toHaveAccessibleDescription('Passwords don’t match.'))
    await expect(args.onSignUp).toHaveBeenCalledOnce()
  },
}

/** Any other failure shows one danger Alert, which takes focus */
export const ServerError: Story = {
  args: {
    onSignUp: fn(async () => {
      throw new Error('Signups are turned off for now.')
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Alex Rivera')
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'correct horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))

    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('Signups are turned off for now.')
    await waitFor(() => expect(alert).toHaveFocus())
    // Wait out the Alert's fade, which axe would read as low contrast
    await waitFor(() => expect(getComputedStyle(alert).opacity).toBe('1'))
  },
}

/** With email confirmation on, the form gives way to a note, and focus moves to its heading */
export const CheckEmail: Story = {
  args: { onSignUp: fn(async () => 'check-email' as const) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Alex Rivera')
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'correct horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))

    const heading = await canvas.findByRole('heading', { level: 1, name: 'Check your email' })
    await waitFor(() => expect(heading).toHaveFocus())
    await expect(canvas.getByText('alex@example.com')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login')
  },
}

/** The submit button reads "Creating account…" while the request is out */
export const Pending: Story = {
  args: { onSignUp: fn(() => new Promise<never>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Alex Rivera')
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct horse')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'correct horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await expect(await canvas.findByRole('button', { name: 'Creating account…' })).toBeDisabled()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

export const SignUpErrorDark: Story = {
  ...SignUpError,
  globals: { theme: 'dark' },
}
