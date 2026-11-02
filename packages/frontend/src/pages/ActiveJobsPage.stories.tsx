import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { AppShell } from '../components/AppShell/AppShell'
import { clearToasts } from '../lib/toast'
import { ActiveJobsScreen, type ActiveJobsScreenProps } from './ActiveJobsPage'

// The rows in the Figma frame, plus enough Applied ones for its counts (14 · 2 · 1)
const year = new Date().getFullYear()
const rows: [string, string, ApplicationStatus, string, string?, boolean?][] = [
  ['Senior Product Designer', 'Northwind Labs', 'Interviewing', '10-02', '$165k–$190k', true],
  ['Staff UX Engineer', 'Brightline Health', 'Interviewing', '09-24', '$180k + equity'],
  ['Principal Designer', 'Fieldnote', 'Offer', '10-09', '$210k'],
  ['Product Designer II', 'Parcel & Pine', 'Applied', '10-28'],
  ['Design Systems Lead', 'Orbital Analytics', 'Applied', '10-21', '$170k–$200k', true],
  ['UX Designer', 'Kestrel Systems', 'Applied', '10-14'],
  ...Array.from({ length: 8 }, (_, i): [string, string, ApplicationStatus, string] => [
    'Product Designer',
    `Company ${i + 1}`,
    'Applied',
    `09-${String(10 - i).padStart(2, '0')}`,
  ]),
  // Not on this list
  ['Content Designer', 'Quiet Co', 'Unlikely', '08-01'],
  ['Visual Designer', 'Nope Inc', 'Rejected', '08-02'],
]

const applications: Application[] = rows.map(([job_title, company, status, day, compensation, is_referral], i) => ({
  id: String(i + 1),
  user_id: 'user-1',
  job_title,
  company,
  compensation,
  is_referral: is_referral ?? false,
  date_applied: `${year}-${day}`,
  status,
  created_at: `${year}-${day}T12:00:00Z`,
  updated_at: `${year}-${day}T12:00:00Z`,
}))

/** Holds the applications in state, so a status change moves the row as the real page does */
function Stateful(args: ActiveJobsScreenProps) {
  const [list, setList] = useState(args.applications)
  return (
    <ActiveJobsScreen
      {...args}
      applications={list}
      onStatusChange={async (application, status) => {
        await args.onStatusChange(application, status)
        setList((current) => current?.map((a) => (a.id === application.id ? { ...a, status } : a)))
      }}
    />
  )
}

const meta = {
  title: 'Screens/Jobs: Active',
  component: ActiveJobsScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  args: {
    applications,
    onStatusChange: fn(async () => {}),
    onAddApplication: fn(),
  },
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/jobs/active']}>
        <AppShell
          counts={{ active: 14, unlikely: 1, rejected: 1 }}
          user={{ name: 'Alex Rivera', email: 'alex@example.com' }}
          onSignOut={fn()}
          onAddApplication={fn()}
        >
          <Story />
        </AppShell>
      </MemoryRouter>
    ),
  ],
  beforeEach: () => {
    clearToasts()
    return clearToasts
  },
} satisfies Meta<typeof ActiveJobsScreen>

export default meta
type Story = StoryObj<typeof meta>

const titlesIn = (list: HTMLElement) => within(list).getAllByRole('link').map((link) => link.textContent)

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Active applications' })).toBeVisible()
    await expect(main.getByText('14 in progress · 2 interviewing · 1 offer')).toBeVisible()

    // Figma's groups and order, newest first within each; Unlikely and Rejected stay out
    const groups = main.getAllByRole('region')
    await expect(groups.map((g) => g.getAttribute('aria-label') ?? within(g).getByRole('heading').textContent)).toEqual([
      'Interviewing',
      'Offers',
      'Applied',
    ])
    await expect(within(groups[0]).getByText('2')).toBeVisible()
    await expect(titlesIn(groups[0])).toEqual(['Senior Product Designer', 'Staff UX Engineer'])
    await expect(titlesIn(groups[2]).slice(0, 3)).toEqual(['Product Designer II', 'Design Systems Lead', 'UX Designer'])
    await expect(main.queryByText('Content Designer')).not.toBeInTheDocument()
    await expect(main.getByText('Applied Oct 2')).toHaveTextContent('$165k–$190k · Applied Oct 2')

    await userEvent.click(main.getByRole('button', { name: 'Add application' }))
    await expect(args.onAddApplication).toHaveBeenCalledOnce()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Below md: the same groups, tighter rows without compensation, no header action */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
    await expect(main.getByPlaceholderText('Search')).toBeVisible()

    // The groups keep their headings, 24px apart (Figma's phone frame is one list; we chose groups)
    await expect(main.getByRole('heading', { name: 'Interviewing' })).toBeVisible()
    await expect(getComputedStyle(main.getByRole('region', { name: 'Offers' }).parentElement!).rowGap).toBe('24px')

    const row = main.getByRole('link', { name: 'Senior Product Designer' }).closest('li')!
    const style = getComputedStyle(row)
    await expect([style.paddingLeft, style.paddingRight, style.columnGap]).toEqual(['16px', '12px', '12px'])
    await expect(within(row).getByText('$165k–$190k ·')).not.toBeVisible()
  },
}

export const PhoneDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Search matches the title or company; groups with no match drop out */
export const Search: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.type(main.getByRole('searchbox', { name: 'Search applications' }), 'designer')
    await expect(main.getByText('12 matching applications')).toBeInTheDocument()

    await userEvent.clear(main.getByRole('searchbox'))
    await userEvent.type(main.getByRole('searchbox'), 'BRIGHTLINE')
    await expect(main.getAllByRole('region')).toHaveLength(1)
    await expect(main.getByText('1 matching application')).toBeInTheDocument()
    // The header still describes the whole list
    await expect(main.getByText('14 in progress · 2 interviewing · 1 offer')).toBeVisible()
  },
}

/** No match: a way back to the full list, with focus returned to the search */
export const NoMatches: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    const search = main.getByRole('searchbox')
    await userEvent.type(search, 'zzz')
    await expect(main.getByRole('heading', { level: 2, name: 'No matches' })).toBeVisible()
    await expect(main.queryAllByRole('region')).toHaveLength(0)

    await userEvent.click(main.getByRole('button', { name: 'Clear search' }))
    await expect(search).toHaveValue('')
    await expect(search).toHaveFocus()
    await expect(main.getAllByRole('region')).toHaveLength(3)
  },
}

/** A status change moves the row to its new group, where it rises in, and the toast offers Undo */
export const StatusChange: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.click(main.getByRole('combobox', { name: 'Status: UX Designer at Kestrel Systems' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Interviewing' }))
    await expect(args.onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ job_title: 'UX Designer' }),
      'Interviewing',
    )

    const interviewing = main.getAllByRole('region')[0]
    await waitFor(() => expect(titlesIn(interviewing)).toContain('UX Designer'))
    await expect(within(interviewing).getByRole('link', { name: 'UX Designer' }).closest('li')).toHaveClass(
      'animate-rise-in',
    )
    await expect(main.getByText('14 in progress · 3 interviewing · 1 offer')).toBeVisible()
    await expect(await canvas.findByText('Moved to Interviewing')).toBeInTheDocument()
    // Let the toast and the row settle before axe checks contrast
    await waitFor(() => expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0))
  },
}

export const Loading: Story = {
  args: { applications: undefined },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('list', { name: 'Loading applications' })).toHaveAttribute('aria-busy', 'true')
    await expect(main.getByRole('searchbox')).toBeDisabled()
    await expect(main.queryByText(/in progress/)).not.toBeInTheDocument()
  },
}

/** Jobs: Empty: nothing tracked yet, so the header has no action and the one way forward is centered */
export const Empty: Story = {
  args: { applications: [] },
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByText('Nothing tracked yet')).toBeVisible()
    await expect(main.getByRole('heading', { level: 2, name: 'Add your first application' })).toBeVisible()
    await expect(main.queryByRole('searchbox')).not.toBeInTheDocument()
    await expect(main.getAllByRole('button', { name: 'Add application' })).toHaveLength(1)
    await userEvent.click(main.getByRole('button', { name: 'Add application' }))
    await expect(args.onAddApplication).toHaveBeenCalledOnce()
  },
}

export const EmptyDark: Story = {
  args: { applications: [] },
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Everything tracked has moved on (not designed in Figma) */
export const NoneActive: Story = {
  args: { applications: applications.filter((a) => a.status === 'Unlikely' || a.status === 'Rejected') },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'No active applications' })).toBeVisible()
  },
}

export const LoadError: Story = {
  args: { applications: undefined, error: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('We couldn’t load your applications.')
  },
}
