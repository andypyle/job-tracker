import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { Application, ApplicationStatus, TimelineStats } from '@jobtracker/shared'
import { AppShell } from '../components/AppShell/AppShell'
import { DashboardScreen } from './DashboardPage'

// The Figma numbers: 42 applications, 40 of them over the last 8 weeks (peak 8)
const statusCounts: [ApplicationStatus, number][] = [
  ['Applied', 22],
  ['Interviewing', 8],
  ['Offer', 2],
  ['Rejected', 5],
  ['Role Eliminated', 1],
  ['Unlikely', 4],
]
// Wednesdays, so each lands in the same week whether weeks start on Sunday or Monday
const weeks: [string, number][] = [
  ['2026-09-02', 3],
  ['2026-09-09', 5],
  ['2026-09-16', 2],
  ['2026-09-23', 6],
  ['2026-09-30', 4],
  ['2026-10-07', 8],
  ['2026-10-14', 5],
  ['2026-10-21', 7],
  ['2026-08-05', 2], // before the chart
]
const dates = weeks.flatMap(([date, n]) => Array<string>(n).fill(date))
const statuses = statusCounts.flatMap(([status, n]) => Array<ApplicationStatus>(n).fill(status))

const applications: Application[] = statuses.map((status, i) => ({
  id: String(i + 1),
  user_id: 'user-1',
  job_title: 'Product Designer',
  company: `Company ${i + 1}`,
  is_referral: false,
  date_applied: dates[i],
  status,
  created_at: `${dates[i]}T12:00:00Z`,
  updated_at: `${dates[i]}T12:00:00Z`,
}))

const timeline: TimelineStats = {
  avg_response_days: 6.4,
  interview_conversion_rate: 0.238,
  avg_interview_to_outcome_days: 11,
  sample_sizes: { response_time: 24, conversion_rate: 42, interview_to_outcome: 5 },
}

const meta = {
  title: 'Screens/Dashboard',
  component: DashboardScreen,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  args: {
    firstName: 'Alex',
    applications,
    timeline,
    onAddApplication: fn(),
    today: '2026-10-21',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <AppShell
          counts={{ active: 32, unlikely: 4, rejected: 6 }}
          user={{ name: 'Alex Rivera', email: 'alex@example.com' }}
          onSignOut={fn()}
          onAddApplication={fn()}
        >
          <Story />
        </AppShell>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof DashboardScreen>

export default meta
type Story = StoryObj<typeof meta>

/** The stats, in order: the first grid under the PageHeader */
const statCells = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('main header + div > div:first-child > *'))

/** Each stat's final value, from its screen-reader copy (the visible one may still be counting) */
const statValues = (canvasElement: HTMLElement) =>
  statCells(canvasElement).flatMap((cell) => Array.from(cell.querySelectorAll('p .sr-only'), (el) => el.textContent))

export const Default: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 1, name: 'Welcome, Alex' })).toBeVisible()

    await expect(statValues(canvasElement)).toEqual(['42', '30', '2', '38.1%', '6.4 days', '23.8%', '11 days'])
    await expect(main.getByText('Based on 24 applications')).toBeVisible()

    // Four stats over three, as in Figma: 268px, then 362.67px
    const widths = statCells(canvasElement).map((el) => Math.round(parseFloat(getComputedStyle(el).width)))
    await expect(widths).toEqual([268, 268, 268, 268, 363, 363, 363])
    await expect(getComputedStyle(statCells(canvasElement)[0]).height).toBe('132px')

    await expect(main.getByRole('group', { name: /^40 applications over 8 weeks, peak 8 in the week of Oct/ })).toBeVisible()
    await expect(main.getByRole('group', { name: 'Applications by status' })).toBeVisible()
    await expect(main.getByText('Rejected').nextElementSibling).toHaveTextContent('6') // with Role Eliminated

    await userEvent.click(main.getByRole('button', { name: 'Add application' }))
    await expect(args.onAddApplication).toHaveBeenCalledOnce()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
}

/** Below md: two columns of compact stats, the last one full width, and no header action */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()

    const cells = statCells(canvasElement)
    const widths = cells.map((el) => Math.round(parseFloat(getComputedStyle(el).width)))
    await expect(widths).toEqual([173, 173, 173, 173, 173, 173, 358])
    await expect(getComputedStyle(cells[0]).height).toBe('116px')
  },
}

export const PhoneDark: Story = {
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Every stat and chart is a skeleton until the applications arrive */
export const Loading: Story = {
  args: { applications: undefined, timeline: undefined },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelectorAll('main [aria-busy="true"]')).toHaveLength(9)
    await expect(canvas.getByText('Total applications: loading')).toBeInTheDocument()
    // The same 132px as the loaded stats, so the rows don't shift when the data arrives
    await expect(statCells(canvasElement).map((el) => getComputedStyle(el).height)).toEqual(Array(7).fill('132px'))
  },
}

/** The timeline stats load on their own */
export const TimelineLoading: Story = {
  args: { timeline: undefined },
  play: async ({ canvasElement }) => {
    await expect(statValues(canvasElement)).toEqual(['42', '30', '2', '38.1%'])
    await expect(canvasElement.querySelectorAll('main [aria-busy="true"]')).toHaveLength(3)
  },
}

/** The timeline averages are null until there's enough history */
export const NotEnoughData: Story = {
  args: {
    timeline: {
      avg_response_days: null,
      interview_conversion_rate: null,
      avg_interview_to_outcome_days: null,
      sample_sizes: { response_time: 0, conversion_rate: 0, interview_to_outcome: 0 },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(statValues(canvasElement).slice(4)).toEqual(['—', '—', '—'])
    await expect(canvas.getAllByText('Not enough data yet')).toHaveLength(3)
  },
}

/** A failed timeline request leaves the rest of the Dashboard working */
export const TimelineError: Story = {
  args: { timeline: undefined, timelineError: true },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Couldn’t load this')).toHaveLength(3)
    await expect(canvas.getByRole('group', { name: 'Applications by status' })).toBeVisible()
  },
}

/** No applications yet: Figma's Jobs: Empty pattern in place of the numbers, and no header action */
export const Empty: Story = {
  args: { applications: [] },
  play: async ({ canvas, args }) => {
    const main = within(canvas.getByRole('main'))
    await expect(main.getByRole('heading', { level: 2, name: 'Add your first application' })).toBeVisible()
    await expect(main.queryByText('Total applications')).not.toBeInTheDocument()
    await userEvent.click(main.getByRole('button', { name: 'Add application' }))
    await expect(args.onAddApplication).toHaveBeenCalledOnce()
  },
}

export const LoadError: Story = {
  args: { applications: undefined, applicationsError: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('We couldn’t load your applications.')
  },
}
