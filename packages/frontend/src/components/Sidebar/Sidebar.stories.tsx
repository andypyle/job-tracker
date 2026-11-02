import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Sidebar } from './Sidebar'

const meta = {
  title: 'Patterns/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  args: {
    counts: { active: 14, unlikely: 4, rejected: 6 },
    user: { name: 'Alex Rivera', email: 'alex@example.com' },
    onSignOut: fn(),
  },
  parameters: { layout: 'fullscreen', route: '/' },
  // 900px tall, as in Figma; the route parameter sets the starting page
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={[parameters.route]}>
        <div className="h-225">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

const marker = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-sidebar-marker]') as HTMLElement
// The marker moves with the `translate` property ("0px 16px"); this reads its y
const markerTop = (canvasElement: HTMLElement) =>
  parseFloat(getComputedStyle(marker(canvasElement)).translate.split(' ')[1] ?? '0')
// Where the marker should end up: the link's top within the nav
const topOf = (link: HTMLElement) =>
  link.getBoundingClientRect().top - (link.closest('nav') as HTMLElement).getBoundingClientRect().top
const transparent = 'rgba(0, 0, 0, 0)'

/** On the dashboard: Dashboard is current and carries the rail */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const nav = canvas.getByRole('navigation', { name: 'Main' })
    const dashboard = within(nav).getByRole('link', { name: 'Dashboard' })
    await expect(dashboard).toHaveAttribute('aria-current', 'page')
    await expect(within(nav).getByRole('list', { name: 'Jobs' })).toBeInTheDocument()
    await expect(within(nav).getByRole('link', { name: 'Active 14' })).toHaveAttribute('href', '/jobs/active')
    await expect(within(nav).getByRole('link', { name: 'Unlikely 4' })).toHaveAttribute('href', '/jobs/unlikely')
    await expect(within(nav).getByRole('link', { name: 'Rejected 6' })).toHaveAttribute('href', '/jobs/rejected')

    // One marker (background and rail), drawn by the Sidebar under the link, which paints neither
    await expect(getComputedStyle(dashboard).borderLeftColor).toBe(transparent)
    await expect(getComputedStyle(dashboard).backgroundColor).toBe(transparent)
    await expect(getComputedStyle(marker(canvasElement)).borderLeftWidth).toBe('3px')
    await expect(getComputedStyle(marker(canvasElement)).height).toBe(`${dashboard.offsetHeight}px`)
    await expect(markerTop(canvasElement)).toBe(topOf(dashboard))
    await expect(getComputedStyle(marker(canvasElement)).opacity).toBe('1')
    // The link's text sits above the marker
    const { x, y, width, height } = dashboard.getBoundingClientRect()
    await expect(dashboard.contains(document.elementFromPoint(x + width / 2, y + height / 2))).toBe(true)
  },
}

/** Following a link slides the marker to it, with no second rail flashing at the destination */
export const RailSlides: Story = {
  play: async ({ canvas, canvasElement }) => {
    // The first position is placed without motion; sliding is on from the next frame
    await waitFor(() => expect(getComputedStyle(marker(canvasElement)).transitionProperty).toContain('translate'))
    const start = markerTop(canvasElement)
    const rejected = canvas.getByRole('link', { name: /Rejected/ })
    await userEvent.click(rejected)
    await expect(rejected).toHaveAttribute('aria-current', 'page')
    // The link itself never shows a rail or background, even mid-transition
    await expect(getComputedStyle(rejected).borderLeftColor).toBe(transparent)
    await expect(getComputedStyle(rejected).backgroundColor).toBe(transparent)
    // On its way: past the start, not yet there
    await waitFor(() => {
      const top = markerTop(canvasElement)
      expect(top).toBeGreaterThan(start)
      expect(top).toBeLessThan(topOf(rejected))
    })
    await waitFor(() => expect(markerTop(canvasElement)).toBe(topOf(rejected)))
    await expect(getComputedStyle(marker(canvasElement)).height).toBe(`${rejected.offsetHeight}px`)
  },
}

/** Off the nav (a detail page), no item is current and there's no marker */
export const NoCurrentItem: Story = {
  parameters: { route: '/jobs/detail/app-1' },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('link', { current: 'page' })).not.toBeInTheDocument()
    await expect(marker(canvasElement)).toBeNull()
  },
}

/** While counts load there are no badges, and the rows keep their height */
export const CountsLoading: Story = {
  args: { counts: undefined },
  parameters: { route: '/jobs/active' },
  play: async ({ canvas }) => {
    const active = canvas.getByRole('link', { name: 'Active' })
    await expect(getComputedStyle(active).height).toBe('48px')
  },
}

/** The account block: the name, the email and Sign out */
export const SignOut: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText('Alex Rivera')).toBeVisible()
    await expect(canvas.getByText('alex@example.com')).toBeVisible()
    await expect(canvas.getByText('AR')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }))
    await expect(args.onSignOut).toHaveBeenCalledOnce()
  },
}

/** A long name and email truncate instead of wrapping */
export const LongName: Story = {
  args: { user: { name: 'Alexandria Montgomery-Riverside', email: 'alexandria.montgomery-riverside@example.com' } },
  play: async ({ canvas }) => {
    const email = canvas.getByText('alexandria.montgomery-riverside@example.com')
    await expect(email.scrollWidth).toBeGreaterThan(email.clientWidth)
  },
}

export const Dark: Story = {
  parameters: { route: '/jobs/active' },
  globals: { theme: 'dark' },
}
