import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { AppShell } from '../components/AppShell/AppShell'
import { clearToasts } from '../lib/toast'
import { UnlikelyJobsScreen, type UnlikelyJobsScreenProps } from './UnlikelyJobsPage'

// The rows in the Figma frame, shuffled so the sort shows, plus two that aren't on this list
const year = new Date().getFullYear()
const rows: [string, string, ApplicationStatus, string, boolean?][] = [
  ['Product Designer', 'Ninebark', 'Unlikely', '10-12'],
  ['Brand Designer', 'Fieldnote Studio', 'Unlikely', '09-14'],
  ['Design Systems Engineer', 'Tidewater', 'Unlikely', '10-03', true],
  ['Senior UI Engineer', 'Lattice Health', 'Unlikely', '09-22'],
  ['UX Designer', 'Kestrel Systems', 'Applied', '10-14'],
  ['Visual Designer', 'Nope Inc', 'Rejected', '08-02'],
]

const applications: Application[] = rows.map(([job_title, company, status, day, is_referral], i) => ({
  id: String(i + 1),
  user_id: 'user-1',
  job_title,
  company,
  is_referral: is_referral ?? false,
  date_applied: `${year}-${day}`,
  status,
  created_at: `${year}-${day}T12:00:00Z`,
  updated_at: `${year}-${day}T12:00:00Z`,
}))

/** Holds the applications in state, so a status change moves the row as the real page does */
function Stateful(args: UnlikelyJobsScreenProps) {
  const [list, setList] = useState(args.applications)
  return (
    <UnlikelyJobsScreen
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
  title: 'Screens/Jobs: Unlikely',
  component: UnlikelyJobsScreen,
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
      <MemoryRouter initialEntries={['/jobs/unlikely']}>
        <AppShell
          counts={{ active: 1, unlikely: 4, rejected: 1 }}
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
} satisfies Meta<typeof UnlikelyJobsScreen>

export default meta
type Story = StoryObj<typeof meta>

const titles = (list: HTMLElement) => within(list).getAllByRole('link').map((link) => link.textContent)

export const Default: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Unlikely' })).toBeVisible()
    await expect(main.getByText('No status change in 2 weeks. Change a status to move it back.')).toBeVisible()

    // One list, no group headings, newest first (Figma's frame is oldest first); other lists' rows stay out
    await expect(main.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
    const list = main.getByRole('list', { name: 'Unlikely applications' })
    await expect(titles(list)).toEqual([
      'Product Designer',
      'Design Systems Engineer',
      'Senior UI Engineer',
      'Brand Designer',
    ])
    await expect(main.getByText('No activity since Sep 14')).toBeVisible()
    await expect(within(list).getByText('Referral')).toBeVisible()

    await userEvent.click(main.getByRole('button', { name: 'Add application' }))
    await expect(args.onAddApplication).toHaveBeenCalledOnce()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Below md: no header action (the Bottom bar has it), shorter placeholder */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
    await expect(main.getByPlaceholderText('Search')).toBeVisible()
    await expect(main.getByRole('link', { name: 'Brand Designer' })).toBeVisible()
  },
}

export const PhoneDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

export const Search: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.type(main.getByRole('searchbox', { name: 'Search applications' }), 'engineer')
    await expect(main.getByText('2 matching applications')).toBeInTheDocument()
    await expect(titles(main.getByRole('list'))).toEqual(['Design Systems Engineer', 'Senior UI Engineer'])

    await userEvent.clear(main.getByRole('searchbox'))
    await userEvent.type(main.getByRole('searchbox'), 'zzz')
    await expect(main.getByRole('heading', { level: 2, name: 'No matches' })).toBeVisible()
    await expect(main.getByText(/Nothing in Unlikely matches “zzz”/)).toBeVisible()
  },
}

/** Moving one back to Applied takes it off this list; Undo brings it back, rising in */
export const StatusChange: Story = {
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.click(main.getByRole('combobox', { name: 'Status: Brand Designer at Fieldnote Studio' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Applied' }))
    await expect(args.onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ job_title: 'Brand Designer' }),
      'Applied',
    )
    await waitFor(() => expect(main.queryByRole('link', { name: 'Brand Designer' })).not.toBeInTheDocument())
    await expect(titles(main.getByRole('list'))).toHaveLength(3)

    await userEvent.click(await canvas.findByRole('button', { name: 'Undo' }))
    const row = await main.findByRole('link', { name: 'Brand Designer' })
    await expect(row.closest('li')).toHaveClass('animate-rise-in')
    // Back in its place: the oldest, so last
    await expect(titles(main.getByRole('list'))[3]).toBe('Brand Designer')
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
  },
}

/** Nothing has gone quiet (not designed in Figma); the header keeps its action */
export const Empty: Story = {
  args: { applications: applications.filter((a) => a.status !== 'Unlikely') },
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 2, name: 'Nothing unlikely' })).toBeVisible()
    await expect(main.queryByRole('searchbox')).not.toBeInTheDocument()
    await expect(main.getByRole('button', { name: 'Add application' })).toBeVisible()
  },
}

export const EmptyDark: Story = {
  args: { applications: [] },
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

export const LoadError: Story = {
  args: { applications: undefined, error: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('We couldn’t load your applications.')
    await expect(within(canvas.getByRole('main')).queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
  },
}
