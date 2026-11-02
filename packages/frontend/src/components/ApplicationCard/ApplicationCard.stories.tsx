import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { Application } from '@jobtracker/shared'
import { todayISO } from '../../lib/calendarDate'
import { clearToasts } from '../../lib/toast'
import { Toaster } from '../Toaster/Toaster'
import { ApplicationCard, ApplicationCardSkeleton } from './ApplicationCard'

// Dates in the current year, so the meta line drops the year as in the Figma screens
const year = todayISO().slice(0, 4)

const application = (overrides: Partial<Application> = {}): Application => ({
  id: 'app-1',
  user_id: 'user-1',
  job_title: 'Senior Product Designer',
  company: 'Northwind Labs',
  compensation: '$165k–$190k',
  is_referral: true,
  date_applied: `${year}-10-21`,
  status: 'Applied',
  created_at: `${year}-10-21T09:00:00Z`,
  updated_at: `${year}-10-21T09:00:00Z`,
  ...overrides,
})

const meta = {
  title: 'Patterns/ApplicationCard',
  component: ApplicationCard,
  tags: ['autodocs'],
  args: {
    application: application(),
    onStatusChange: fn(),
  },
  beforeEach: () => clearToasts(),
  // 720px wide, as in Figma. The detail route shows where the row leads.
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={['/jobs/active']}>
        <Routes>
          <Route
            path="/jobs/active"
            element={
              <ul className={parameters.narrow ? 'flex w-89.5 flex-col gap-3' : 'flex w-180 flex-col gap-3'}>
                <Story />
              </ul>
            }
          />
          <Route path="/jobs/detail/:id" element={<p>Application detail</p>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ApplicationCard>

export default meta
type Story = StoryObj<typeof meta>

const row = (canvasElement: HTMLElement) => canvasElement.querySelector('li') as HTMLLIElement
// What a pointer at the element's center lands on (userEvent.click skips hit testing)
const hit = (element: Element) => {
  const { x, y, width, height } = element.getBoundingClientRect()
  return document.elementFromPoint(x + width / 2, y + height / 2) as HTMLElement
}

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(getComputedStyle(row(canvasElement)).height).toBe('80px')
    await expect(canvas.getByText('NL')).toBeInTheDocument()
    await expect(canvas.getByText('Northwind Labs')).toBeVisible()
    await expect(canvas.getByText('Applied Oct 21')).toHaveTextContent('$165k–$190k · Applied Oct 21')
    await expect(canvas.getByText('Referral')).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Status: Senior Product Designer at Northwind Labs' })).toHaveTextContent(
      'Applied',
    )

    // A press anywhere on the row opens the application
    await userEvent.click(hit(canvas.getByText('Northwind Labs')))
    await expect(await canvas.findByText('Application detail')).toBeVisible()
  },
}

/** Changing the status saves it, shows the Undo toast, and doesn't open the row */
export const ChangeStatus: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox')
    await userEvent.click(hit(trigger))
    await userEvent.click(canvas.getByRole('option', { name: 'Interviewing' }))
    await expect(args.onStatusChange).toHaveBeenCalledWith('Interviewing')
    await expect(canvas.queryByText('Application detail')).not.toBeInTheDocument()
    const notifications = within(document.querySelector('section[aria-label="Notifications"]') as HTMLElement)
    await expect(await notifications.findByRole('status')).toHaveTextContent(
      'Moved to InterviewingSenior Product Designer at Northwind Labs',
    )
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))
  },
}

/** Unlikely rows say how long it's been quiet: the nightly job moves Applied after 14 days */
export const Unlikely: Story = {
  args: {
    application: application({ status: 'Unlikely', compensation: undefined, is_referral: false, date_applied: `${year}-09-14` }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No activity since Sep 14')).toBeVisible()
    await expect(canvas.queryByText('Referral')).not.toBeInTheDocument()
  },
}

export const FromAnotherYear: Story = {
  args: { application: application({ date_applied: `${Number(year) - 1}-12-30` }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(`Applied Dec 30, ${Number(year) - 1}`)).toHaveTextContent(
      `$165k–$190k · Applied Dec 30, ${Number(year) - 1}`,
    )
  },
}

export const WithLogo: Story = {
  args: {
    application: application({
      company_logo_url:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%231e5fd9"/%3E%3C/svg%3E',
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(row(canvasElement).querySelector('img')).toBeInTheDocument()
  },
}

/** A logo that fails to load falls back to the initials */
export const BrokenLogo: Story = {
  args: { application: application({ company_logo_url: '/missing-logo.png' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('NL')).toBeVisible()
  },
}

export const Selected: Story = {
  args: { selected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Senior Product Designer' })).toHaveAttribute('aria-current', 'page')
  },
}

/** Below md: 358px wide, a long title wraps and the row grows */
export const Narrow: Story = {
  parameters: { narrow: true },
  args: { application: application({ status: 'Interviewing', compensation: undefined }) },
  play: async ({ canvasElement }) => {
    await expect(row(canvasElement).getBoundingClientRect().height).toBeGreaterThan(80)
  },
}

const list: Application[] = [
  application({ id: '1', status: 'Interviewing' }),
  application({ id: '2', job_title: 'Staff UX Engineer', company: 'Brightline Health', status: 'Offer', is_referral: false }),
  application({ id: '3', job_title: 'Principal Designer', company: 'Fieldnote', status: 'Rejected', compensation: undefined, is_referral: false }),
  application({ id: '4', job_title: 'Brand Designer', company: 'Tidewater', status: 'Unlikely', compensation: undefined }),
]

export const List: Story = {
  render: (args) => (
    <>
      {list.map((item) => (
        <ApplicationCard key={item.id} {...args} application={item} />
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
  },
}

export const ListDark: Story = {
  ...List,
  globals: { theme: 'dark' },
}

/** Loading rows, 88px as in Figma; the list carries aria-busy */
export const Skeleton: Story = {
  render: () => (
    <>
      <ApplicationCardSkeleton />
      <ApplicationCardSkeleton />
      <ApplicationCardSkeleton />
    </>
  ),
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('li')
    await expect(rows).toHaveLength(3)
    await expect(getComputedStyle(rows[0]).height).toBe('88px')
    await expect(rows[0]).toHaveAttribute('aria-hidden', 'true')
  },
}

export const SkeletonDark: Story = {
  ...Skeleton,
  globals: { theme: 'dark' },
}
