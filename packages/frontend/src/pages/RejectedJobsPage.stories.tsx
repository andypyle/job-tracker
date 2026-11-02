import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { AppShell } from '../components/AppShell/AppShell'
import { clearToasts } from '../lib/toast'
import { RejectedJobsScreen, type RejectedJobsScreenProps } from './RejectedJobsPage'

// Not designed in Figma: the Unlikely layout with Rejected and Role Eliminated rows
const year = new Date().getFullYear()
const rows: [string, string, ApplicationStatus, string, string?][] = [
  ['Staff Product Designer', 'Brightline Health', 'Rejected', '09-03', '$185k'],
  ['Design Lead', 'Orbital Analytics', 'Role Eliminated', '09-18'],
  ['Senior Designer', 'Parcel & Pine', 'Rejected', '10-06'],
  ['UX Designer', 'Kestrel Systems', 'Applied', '10-14'],
  ['Brand Designer', 'Fieldnote Studio', 'Unlikely', '09-14'],
]

const applications: Application[] = rows.map(([job_title, company, status, day, compensation], i) => ({
  id: String(i + 1),
  user_id: 'user-1',
  job_title,
  company,
  compensation,
  is_referral: false,
  date_applied: `${year}-${day}`,
  status,
  created_at: `${year}-${day}T12:00:00Z`,
  updated_at: `${year}-${day}T12:00:00Z`,
}))

/** Holds the applications in state, so a status change moves the row as the real page does */
function Stateful(args: RejectedJobsScreenProps) {
  const [list, setList] = useState(args.applications)
  return (
    <RejectedJobsScreen
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
  title: 'Screens/Jobs: Rejected',
  component: RejectedJobsScreen,
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
      <MemoryRouter initialEntries={['/jobs/rejected']}>
        <AppShell
          counts={{ active: 1, unlikely: 1, rejected: 3 }}
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
} satisfies Meta<typeof RejectedJobsScreen>

export default meta
type Story = StoryObj<typeof meta>

const titles = (list: HTMLElement) => within(list).getAllByRole('link').map((link) => link.textContent)

/** Rejected and Role Eliminated together, newest first */
export const Default: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Rejected' })).toBeVisible()
    const list = main.getByRole('list', { name: 'Rejected applications' })
    await expect(titles(list)).toEqual(['Senior Designer', 'Design Lead', 'Staff Product Designer'])
    await expect(
      within(list).getByRole('combobox', { name: 'Status: Design Lead at Orbital Analytics' }),
    ).toHaveTextContent('Role Eliminated')
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
}

/** Moving one back to Interviewing takes it off this list */
export const StatusChange: Story = {
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole('main'))
    await userEvent.click(main.getByRole('combobox', { name: 'Status: Senior Designer at Parcel & Pine' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Interviewing' }))
    await waitFor(() => expect(main.queryByRole('link', { name: 'Senior Designer' })).not.toBeInTheDocument())
    await expect(await canvas.findByText('Moved to Interviewing')).toBeInTheDocument()
    await waitFor(() => expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0))
  },
}

export const Empty: Story = {
  args: { applications: applications.filter((a) => a.status === 'Applied') },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'No rejections' })).toBeVisible()
  },
}
