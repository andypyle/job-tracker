import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { AppShell } from '../components/AppShell/AppShell'
import { clearToasts } from '../lib/toast'
import { ApplicationDetailScreen, type ApplicationDetailScreenProps } from './ApplicationDetailPage'

// The Figma frame's application. Times have no zone, so they read the same in any time zone.
const application: Application = {
  id: '1',
  user_id: 'user-1',
  job_title: 'Senior Product Designer',
  company: 'Northwind Labs',
  job_post_url: 'https://jobs.northwindlabs.com/designer-412',
  industry: 'Technology',
  compensation: '$165k–$190k',
  notes: 'Recruiter: Priya. Portfolio review with the design lead; prep the design systems case study.',
  is_referral: true,
  resume_path: 'user-1/1/resume.pdf',
  resume_url: 'https://storage.example.com/signed/resume.pdf?token=abc',
  date_applied: '2026-10-02',
  status: 'Interviewing',
  created_at: '2026-10-02T10:02:00',
  updated_at: '2026-10-09T15:14:00',
  status_history: [
    {
      id: 'h1',
      application_id: '1',
      old_status: null,
      new_status: 'Applied',
      changed_at: '2026-10-02T10:02:00',
      is_automatic: false,
    },
    {
      id: 'h2',
      application_id: '1',
      old_status: 'Applied',
      new_status: 'Interviewing',
      changed_at: '2026-10-09T15:14:00',
      is_automatic: false,
    },
  ],
}

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
// Waits for finite motion (dialog, toasts) before axe reads contrast
const settle = () =>
  Promise.all(
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})),
  )

/** Holds the status in state, so a change shows as the real page's refetch would */
function Stateful(args: ApplicationDetailScreenProps) {
  const [status, setStatus] = useState<ApplicationStatus | undefined>(args.application?.status)
  return (
    <ApplicationDetailScreen
      {...args}
      application={args.application && status ? { ...args.application, status } : args.application}
      onStatusChange={async (next) => {
        await args.onStatusChange(next)
        setStatus(next)
      }}
    />
  )
}

const meta = {
  title: 'Screens/Application detail',
  component: ApplicationDetailScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  args: {
    application,
    today: '2026-11-02',
    onStatusChange: fn(async () => {}),
    onEdit: fn(),
    onDelete: fn(() => deletion.promise),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/jobs/detail/1']}>
        {/* No onAddApplication: this page has no Bottom bar, the MobileNav trigger floats */}
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
    clearToasts()
    return clearToasts
  },
} satisfies Meta<typeof ApplicationDetailScreen>

export default meta
type Story = StoryObj<typeof meta>

const value = (main: ReturnType<typeof within>, term: string) =>
  main.getByText(term, { selector: 'dt' }).nextElementSibling as HTMLElement

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Senior Product Designer' })).toBeVisible()
    // Split across spans so the date can drop to its own line on phones
    await expect(
      main.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Northwind Labs · Applied Oct 2, 2026'),
    ).toBeVisible()
    // Back to the list that holds it
    await expect(main.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/jobs/active')

    // Summary
    await expect(main.getByRole('combobox', { name: 'Status: Senior Product Designer at Northwind Labs' })).toHaveTextContent(
      'Interviewing',
    )
    await expect(main.getByText('Referral')).toBeVisible()
    await expect(main.getByText('Last update Oct 9')).toBeVisible()

    // Details: links open in a new tab and say so
    const details = within(main.getByRole('region', { name: 'Details' }))
    const post = details.getByRole('link', { name: /jobs\.northwindlabs\.com\/designer-412/ })
    await expect(post).toHaveAttribute('href', 'https://jobs.northwindlabs.com/designer-412')
    await expect(post).toHaveAttribute('target', '_blank')
    await expect(post).toHaveAccessibleName('jobs.northwindlabs.com/designer-412 (opens in a new tab)')
    await expect(value(details, 'Applied')).toHaveTextContent('October 2, 2026')
    await expect(details.getByRole('link', { name: /resume\.pdf/ })).toHaveAttribute('href', application.resume_url)
    await expect(value(details, 'Cover letter')).toHaveTextContent('Not set')
    // Labels inline at this width; the last item has no divider
    const items = details.getAllByRole('definition').map((dd) => dd.parentElement!)
    await expect(getComputedStyle(items[0]).flexDirection).toBe('row')
    await expect(getComputedStyle(items[0]).borderBottomWidth).toBe('1px')
    await expect(getComputedStyle(items[items.length - 1]).borderBottomWidth).toBe('0px')

    // Status history: newest first, side by side with Details
    const history = main.getByRole('region', { name: 'Status history' })
    const events = within(history).getAllByRole('listitem')
    await expect(events.map((li) => li.textContent)).toEqual([
      'InterviewingMoved from Applied to InterviewingOct 9, 2026 · 3:14 PM',
      'AppliedApplication createdOct 2, 2026 · 10:02 AM',
    ])
    await expect(getComputedStyle(history).width).toBe('400px')

    await userEvent.click(main.getByRole('button', { name: 'Edit' }))
    await expect(args.onEdit).toHaveBeenCalledOnce()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Below md: Edit stays beside the title, the cards stack, labels sit above their values */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    // The title has the full width (one 32px line); Edit sits under it, beside the description,
    // and the applied date has its own line
    const title = main.getByRole('heading', { level: 1 })
    await expect(getComputedStyle(title).height).toBe('32px')
    const edit = main.getByRole('button', { name: 'Edit' })
    await expect(edit).toBeVisible()
    await expect(edit.getBoundingClientRect().top).toBeGreaterThan(title.getBoundingClientRect().bottom)
    await expect(getComputedStyle(main.getByText('Applied Oct 2, 2026')).display).toBe('block')
    const details = main.getByRole('region', { name: 'Details' })
    const history = main.getByRole('region', { name: 'Status history' })
    await expect(details.getBoundingClientRect().bottom).toBeLessThan(history.getBoundingClientRect().top)
    const first = within(details).getAllByRole('definition')[0].parentElement!
    await expect(getComputedStyle(first).flexDirection).toBe('column')
    // No Bottom bar on this page; the menu trigger floats
    await expect(canvas.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
  },
}

export const PhoneDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Empty fields read "Not set"; the nightly Unlikely move is a system event, with no badge */
export const SparseAndAutomatic: Story = {
  args: {
    application: {
      ...application,
      job_post_url: undefined,
      industry: undefined,
      compensation: undefined,
      notes: undefined,
      is_referral: false,
      resume_path: undefined,
      resume_url: undefined,
      company_logo_url: undefined,
      status: 'Unlikely',
      date_applied: '2025-09-01',
      updated_at: '2025-09-16T03:00:00',
      status_history: [
        {
          id: 'h1',
          application_id: '1',
          old_status: null,
          new_status: 'Applied',
          changed_at: '2025-09-01T09:00:00',
          is_automatic: false,
        },
        {
          id: 'h2',
          application_id: '1',
          old_status: 'Applied',
          new_status: 'Unlikely',
          changed_at: '2025-09-16T03:00:00',
          is_automatic: true,
        },
      ],
    },
  },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/jobs/unlikely')
    await expect(main.queryByText('Referral')).not.toBeInTheDocument()
    // Another year: the year shows
    await expect(main.getByText('Last update Sep 16, 2025')).toBeVisible()
    const details = within(main.getByRole('region', { name: 'Details' }))
    for (const term of ['Job post', 'Industry', 'Compensation', 'Resume', 'Cover letter', 'Notes']) {
      await expect(value(details, term)).toHaveTextContent('Not set')
    }
    const [automatic] = within(main.getByRole('region', { name: 'Status history' })).getAllByRole('listitem')
    await expect(automatic).toHaveTextContent('Marked Unlikely after 2 weeks with no status change')
    await expect(within(automatic).queryByText('Unlikely', { exact: true })).not.toBeInTheDocument()
  },
}

export const StatusChange: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.click(main.getByRole('combobox', { name: /^Status:/ }))
    await userEvent.click(await page.findByRole('option', { name: 'Offer' }))
    await expect(args.onStatusChange).toHaveBeenCalledWith('Offer')
    await settle()
    await expect(await page.findByText('Moved to Offer')).toBeVisible()
  },
}

/** The alertdialog: focus starts on Cancel; Cancel and Esc close it; the scrim does nothing */
export const Delete: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    const trigger = main.getByRole('button', { name: 'Delete application' })
    await userEvent.click(trigger)
    const dialog = (await page.findByRole('alertdialog', { name: 'Delete this application?' })) as HTMLDialogElement
    await expect(dialog).toHaveAccessibleDescription(
      'Senior Product Designer at Northwind Labs and its status history will be removed. You can’t undo this.',
    )
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus())
    await userEvent.click(dialog)
    await expect(dialog.open).toBe(true)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(dialog.open).toBe(false))
    await waitFor(() => expect(trigger).toHaveFocus())
    await expect(args.onDelete).not.toHaveBeenCalled()

    // Confirm: pending until the delete settles, and Esc can't close it meanwhile
    await userEvent.click(trigger)
    const confirm = await within(dialog).findByRole('button', { name: 'Delete application' })
    await userEvent.click(confirm)
    await expect(args.onDelete).toHaveBeenCalledOnce()
    await expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    await expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(dialog.open).toBe(true)
    deletion.resolve()
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Delete application' })).toBeEnabled())
    await settle()
  },
}

/** A failed delete shows why in the dialog, which stays open to try again */
export const DeleteError: Story = {
  args: { onDelete: fn(async () => Promise.reject(new Error('Network Error'))) },
  play: async ({ canvas }) => {
    await userEvent.click(within(canvas.getByRole('main')).getByRole('button', { name: 'Delete application' }))
    const dialog = (await page.findByRole('alertdialog')) as HTMLDialogElement
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete application' }))
    await expect(await within(dialog).findByRole('alert')).toHaveTextContent('Couldn’t delete it. Network Error')
    await expect(dialog.open).toBe(true)
    await settle()
  },
}

/** Below md the confirmation stays a centered dialog, not a sheet */
export const DeletePhone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    await userEvent.click(within(canvas.getByRole('main')).getByRole('button', { name: 'Delete application' }))
    const dialog = await page.findByRole('alertdialog')
    await expect(getComputedStyle(dialog).width).toBe('358px')
    await settle()
  },
}

export const DeleteDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await userEvent.click(within(canvas.getByRole('main')).getByRole('button', { name: 'Delete application' }))
    await page.findByRole('alertdialog')
    await settle()
  },
}

export const Loading: Story = {
  args: { application: undefined },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Loading application' })).toBeInTheDocument()
    await expect(canvas.getByRole('main').querySelector('[aria-busy="true"]')).not.toBeNull()
  },
}

export const NotFound: Story = {
  args: { application: undefined, error: 'not-found' },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Application not found' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/jobs/active')
  },
}

export const LoadError: Story = {
  args: { application: undefined, error: 'failed' },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Couldn’t load this application' })).toBeVisible()
    await expect(main.getByText('Refresh the page to try again.')).toBeVisible()
  },
}
