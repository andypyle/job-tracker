import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { LoginScreen } from './LoginPage'

const meta = {
  title: 'Screens/Login',
  component: LoginScreen,
  parameters: { layout: 'fullscreen' },
  args: { onSignIn: fn(async () => {}) },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof LoginScreen>

export default meta
type Story = StoryObj<typeof meta>

const mismatch = 'That email and password don’t match. Check them and try again.'

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await expect(canvas.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    await expect(canvas.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/register')
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
  },
}

/** Signs in with the trimmed email and the password as typed */
export const SignsIn: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText('Email'), '  alex@example.com ')
    await userEvent.type(canvas.getByLabelText('Password'), ' secret pass ')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(args.onSignIn).toHaveBeenCalledWith('alex@example.com', ' secret pass '))
  },
}

/** Empty fields get field errors on submit, and focus goes to the first */
export const Required: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(canvas.getByLabelText('Email')).toHaveFocus())
    await expect(canvas.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email')
    await expect(canvas.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password')
    await expect(args.onSignIn).not.toHaveBeenCalled()

    await userEvent.type(canvas.getByLabelText('Email'), 'alex@')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await waitFor(() =>
      expect(canvas.getByLabelText('Email')).toHaveAccessibleDescription('Enter an email like name@example.com'),
    )
  },
}

/**
 * Figma's Login error: one Alert, which takes focus. The email stays, the password is cleared,
 * and neither field is marked invalid.
 */
export const WrongPassword: Story = {
  args: {
    onSignIn: fn(async () => {
      throw new Error(mismatch)
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))

    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent(mismatch)
    await waitFor(() => expect(alert).toHaveFocus())
    await expect(canvas.getByLabelText('Email')).toHaveValue('alex@example.com')
    await expect(canvas.getByLabelText('Password')).toHaveValue('')
    await expect(canvas.getByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByLabelText('Password')).not.toHaveAttribute('aria-invalid', 'true')
    // Wait out the Alert's fade, which axe would read as low contrast
    await waitFor(() => expect(getComputedStyle(alert).opacity).toBe('1'))
  },
}

/** The submit button reads "Signing in…" while the request is out */
export const Pending: Story = {
  args: { onSignIn: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'secret')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await expect(await canvas.findByRole('button', { name: 'Signing in…' })).toBeDisabled()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

export const WrongPasswordDark: Story = {
  ...WrongPassword,
  globals: { theme: 'dark' },
}
