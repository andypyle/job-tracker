import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { AppShell } from '../components/AppShell/AppShell'
import { SettingsScreen, type SettingsScreenProps } from './SettingsPage'

// A promise the play function settles by hand
function deferred() {
  let resolve: () => void = () => {}
  let reject: (error: Error) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
let deletion = deferred()

const page = within(document.body)
// Waits for finite motion (dialog, select menu) before axe reads contrast
const settle = () =>
  Promise.all(
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})),
  )

const meta = {
  title: 'Screens/Settings',
  component: SettingsScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  args: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    settings: { unlikely_after_days: 14 },
    applicationCount: 24,
    onSaveName: fn(async () => {}),
    onChangeEmail: fn<SettingsScreenProps['onChangeEmail']>(async () => 'sent'),
    onChangePassword: fn<SettingsScreenProps['onChangePassword']>(async () => 'changed'),
    onSaveTracking: fn(async () => {}),
    onDeleteAccount: fn(() => deletion.promise),
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/settings']}>
        {/* No onAddApplication: like Application detail, Settings has no Bottom bar */}
        <AppShell
          counts={{ active: 14, unlikely: 4, rejected: 6 }}
          user={{ name: 'Alex Rivera', email: 'alex@example.com' }}
          onSignOut={fn()}
        >
          <Story />
        </AppShell>
      </MemoryRouter>
    ),
  ],
  beforeEach: () => {
    deletion = deferred()
  },
} satisfies Meta<typeof SettingsScreen>

export default meta
type Story = StoryObj<typeof meta>

const region = (canvas: ReturnType<typeof within>, name: string) =>
  within(within(canvas.getByRole('main')).getByRole('region', { name }))

export const Default: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    // The sections, in order
    const titles = main.getAllByRole('region').map((section) => within(section).getByRole('heading', { level: 2 }).textContent)
    await expect(titles).toEqual([
      'Profile',
      'Email',
      'Password',
      'Tracking',
      'Delete account',
    ])
    await expect(region(canvas, 'Profile').getByLabelText('Full name')).toHaveValue('Alex Rivera')
    await expect(region(canvas, 'Email').getByLabelText('Email address')).toHaveValue('alex@example.com')
    await expect(region(canvas, 'Password').getByLabelText('New password')).toHaveValue('')
    await expect(region(canvas, 'Tracking').getByRole('combobox', { name: 'Move to Unlikely after' })).toHaveTextContent('14 days')
    await expect(region(canvas, 'Delete account').getByText(/all 24 applications/)).toBeVisible()

    // One 720px column, the new passwords side by side
    await expect(getComputedStyle(main.getByRole('region', { name: 'Profile' })).width).toBe('720px')
    const newPassword = region(canvas, 'Password').getByLabelText('New password')
    const confirm = region(canvas, 'Password').getByLabelText('Confirm new password')
    await expect(newPassword.getBoundingClientRect().top).toBe(confirm.getBoundingClientRect().top)

    // The sidebar marks Settings as the current page
    const settings = within(canvas.getByRole('complementary')).getByRole('link', { name: 'Settings' })
    await expect(settings).toHaveAttribute('aria-current', 'page')
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Below md: full width, the new passwords stack, and no Bottom bar (the menu trigger floats) */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    const newPassword = region(canvas, 'Password').getByLabelText('New password')
    const confirm = region(canvas, 'Password').getByLabelText('Confirm new password')
    await expect(confirm.getBoundingClientRect().top).toBeGreaterThan(newPassword.getBoundingClientRect().bottom)
    await expect(canvas.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
  },
}

export const PhoneDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** The avatar previews the initials; Save sends the trimmed name */
export const SaveName: Story = {
  play: async ({ canvas, args }) => {
    const profile = region(canvas, 'Profile')
    const field = profile.getByLabelText('Full name')
    await userEvent.clear(field)
    await userEvent.type(field, '  Sam Okafor ')
    await expect(profile.getByText('SO')).toBeVisible()
    await userEvent.click(profile.getByRole('button', { name: 'Save name' }))
    await expect(args.onSaveName).toHaveBeenCalledWith('Sam Okafor')
  },
}

export const NameRequired: Story = {
  play: async ({ canvas, args }) => {
    const profile = region(canvas, 'Profile')
    await userEvent.clear(profile.getByLabelText('Full name'))
    await userEvent.click(profile.getByRole('button', { name: 'Save name' }))
    await expect(await profile.findByText('Enter your name')).toBeVisible()
    await expect(profile.getByLabelText('Full name')).toHaveFocus()
    await expect(args.onSaveName).not.toHaveBeenCalled()
  },
}

/** A failed save: a danger Alert in that section, which takes focus; the other sections carry on */
export const SaveFailed: Story = {
  args: { onSaveName: fn(async () => Promise.reject(new Error('Network Error'))) },
  play: async ({ canvas }) => {
    const profile = region(canvas, 'Profile')
    await userEvent.click(profile.getByRole('button', { name: 'Save name' }))
    const alert = await profile.findByRole('alert')
    await expect(alert).toHaveTextContent('Network Error')
    await waitFor(() => expect(alert).toHaveFocus())
    await expect(region(canvas, 'Email').queryByRole('alert')).not.toBeInTheDocument()
  },
}

export const ChangeEmail: Story = {
  play: async ({ canvas, args }) => {
    const section = region(canvas, 'Email')
    const field = section.getByLabelText('Email address')
    const submit = section.getByRole('button', { name: 'Change email' })

    // The current address, in any case, isn't a change
    await userEvent.clear(field)
    await userEvent.type(field, 'Alex@Example.com')
    await userEvent.click(submit)
    await expect(await section.findByText('That’s already your email.')).toBeVisible()

    await userEvent.clear(field)
    await userEvent.type(field, 'not-an-email')
    await userEvent.click(submit)
    await expect(await section.findByText('Enter an email like name@example.com')).toBeVisible()
    await expect(args.onChangeEmail).not.toHaveBeenCalled()

    await userEvent.clear(field)
    await userEvent.type(field, 'alex.rivera@example.org')
    await userEvent.click(submit)
    await expect(args.onChangeEmail).toHaveBeenCalledWith('alex.rivera@example.org')
  },
}

export const EmailTaken: Story = {
  args: { onChangeEmail: fn<SettingsScreenProps['onChangeEmail']>(async () => 'email-taken') },
  play: async ({ canvas }) => {
    const section = region(canvas, 'Email')
    const field = section.getByLabelText('Email address')
    await userEvent.clear(field)
    await userEvent.type(field, 'sam@example.com')
    await userEvent.click(section.getByRole('button', { name: 'Change email' }))
    await expect(await section.findByText('There’s already an account with this email.')).toBeVisible()
    await expect(field).toHaveFocus()
    await expect(field).toHaveAttribute('aria-invalid', 'true')
  },
}

/** An email change waiting on its confirmation links */
export const EmailPending: Story = {
  args: { pendingEmail: 'alex.rivera@example.org' },
  play: async ({ canvas }) => {
    await expect(region(canvas, 'Email').getByLabelText('Email address')).toHaveAccessibleDescription(
      'Waiting on alex.rivera@example.org: open the links we sent to both addresses to finish the change.',
    )
  },
}

export const ChangePassword: Story = {
  play: async ({ canvas, args }) => {
    const section = region(canvas, 'Password')
    const password = section.getByLabelText('New password')
    const confirm = section.getByLabelText('Confirm new password')
    const submit = section.getByRole('button', { name: 'Change password' })

    await userEvent.type(password, 'short')
    await userEvent.type(confirm, 'other')
    await userEvent.click(submit)
    await expect(await section.findByText('Use at least 8 characters.')).toBeVisible()
    await expect(section.getByText('Passwords don’t match.')).toBeVisible()
    await expect(args.onChangePassword).not.toHaveBeenCalled()

    await userEvent.clear(password)
    await userEvent.type(password, 'correct-horse-battery')
    await userEvent.clear(confirm)
    await userEvent.type(confirm, 'correct-horse-battery')
    await userEvent.click(submit)
    await expect(args.onChangePassword).toHaveBeenCalledWith('correct-horse-battery')
    // Cleared once it's changed
    await waitFor(() => expect(password).toHaveValue(''))
    await expect(confirm).toHaveValue('')
  },
}

export const SamePassword: Story = {
  args: { onChangePassword: fn<SettingsScreenProps['onChangePassword']>(async () => 'same-password') },
  play: async ({ canvas }) => {
    const section = region(canvas, 'Password')
    await userEvent.type(section.getByLabelText('New password'), 'correct-horse-battery')
    await userEvent.type(section.getByLabelText('Confirm new password'), 'correct-horse-battery')
    await userEvent.click(section.getByRole('button', { name: 'Change password' }))
    await expect(await section.findByText('That’s your current password. Choose a new one.')).toBeVisible()
    await expect(section.getByLabelText('New password')).toHaveFocus()
  },
}

/** Never sends null, which turns the nightly move off */
export const TrackingNever: Story = {
  play: async ({ canvas, args }) => {
    const section = region(canvas, 'Tracking')
    await userEvent.click(section.getByRole('combobox', { name: 'Move to Unlikely after' }))
    const listbox = await page.findByRole('listbox')
    await expect(within(listbox).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '7 days',
      '14 days',
      '21 days',
      '30 days',
      '60 days',
      'Never',
    ])
    await userEvent.click(within(listbox).getByRole('option', { name: 'Never' }))
    await userEvent.click(section.getByRole('button', { name: 'Save' }))
    await expect(args.onSaveTracking).toHaveBeenCalledWith(null)
    await settle()
  },
}

export const TrackingDays: Story = {
  args: { settings: { unlikely_after_days: null } },
  play: async ({ canvas, args }) => {
    const section = region(canvas, 'Tracking')
    const select = section.getByRole('combobox', { name: 'Move to Unlikely after' })
    await expect(select).toHaveTextContent('Never')
    await userEvent.click(select)
    await userEvent.click(await page.findByRole('option', { name: '30 days' }))
    await userEvent.click(section.getByRole('button', { name: 'Save' }))
    await expect(args.onSaveTracking).toHaveBeenCalledWith(30)
    await settle()
  },
}

/** While the setting loads, its field and Save are disabled */
export const TrackingLoading: Story = {
  args: { settings: undefined },
  play: async ({ canvas }) => {
    const section = region(canvas, 'Tracking')
    await expect(section.getByRole('combobox', { name: 'Move to Unlikely after' })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}

export const TrackingError: Story = {
  args: { settings: undefined, settingsError: true },
  play: async ({ canvas }) => {
    const section = region(canvas, 'Tracking')
    await expect(section.getByRole('alert')).toHaveTextContent('Couldn’t load this setting. Refresh the page to try again.')
    await expect(section.queryByRole('combobox')).not.toBeInTheDocument()
  },
}

/**
 * The alertdialog: focus starts in the field, Delete stays disabled until the typed email
 * matches (in any case), and while deleting nothing can close it
 */
export const DeleteAccount: Story = {
  play: async ({ canvas, args }) => {
    const trigger = region(canvas, 'Delete account').getByRole('button', { name: 'Delete account' })
    await userEvent.click(trigger)
    const dialog = (await page.findByRole('alertdialog', { name: 'Delete your account?' })) as HTMLDialogElement
    await expect(dialog).toHaveAccessibleDescription(
      'Your 24 applications, their status history and every uploaded file will be deleted. You can’t undo this.',
    )
    const field = within(dialog).getByLabelText('Type your email to confirm')
    await waitFor(() => expect(field).toHaveFocus())
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' })
    await expect(confirm).toBeDisabled()

    await userEvent.type(field, 'alex@example.co')
    await expect(confirm).toBeDisabled()
    await userEvent.type(field, 'M')
    await expect(confirm).toBeEnabled()

    // Cancel closes it, and the next open starts empty
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(dialog.open).toBe(false))
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await waitFor(() => expect(field).toHaveValue(''))

    await userEvent.type(field, 'alex@example.com{Enter}')
    await expect(args.onDeleteAccount).toHaveBeenCalledOnce()
    await expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    await expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(dialog.open).toBe(true)
    deletion.resolve()
    await settle()
  },
}

/** A failed delete shows why in the dialog, which stays open to try again */
export const DeleteAccountError: Story = {
  args: { onDeleteAccount: fn(async () => Promise.reject(new Error('Network Error'))) },
  play: async ({ canvas }) => {
    await userEvent.click(region(canvas, 'Delete account').getByRole('button', { name: 'Delete account' }))
    const dialog = (await page.findByRole('alertdialog')) as HTMLDialogElement
    await userEvent.type(within(dialog).getByLabelText('Type your email to confirm'), 'alex@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }))
    await expect(await within(dialog).findByRole('alert')).toHaveTextContent('Couldn’t delete your account. Network Error')
    await expect(dialog.open).toBe(true)
    await expect(within(dialog).getByRole('button', { name: 'Delete account' })).toBeEnabled()
    await settle()
  },
}

/** Below md the confirmation stays a centered dialog, not a sheet */
export const DeleteAccountPhone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    await userEvent.click(region(canvas, 'Delete account').getByRole('button', { name: 'Delete account' }))
    const dialog = await page.findByRole('alertdialog')
    await expect(getComputedStyle(dialog).width).toBe('358px')
    await settle()
  },
}
