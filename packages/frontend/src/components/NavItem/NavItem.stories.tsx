import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, userEvent, waitFor } from 'storybook/test'
import { NavItem } from './NavItem'

const meta = {
  title: 'Components/NavItem',
  component: NavItem,
  tags: ['autodocs'],
  args: { to: '/', end: true, icon: 'dashboard', children: 'Dashboard' },
  // In a 216px sidebar column, as in Figma, with the router on /jobs/active
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/jobs/active']}>
        <nav aria-label="Main" className="flex w-54 flex-col gap-1 bg-bg-surface p-2">
          <Story />
        </nav>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof NavItem>

export default meta
type Story = StoryObj<typeof meta>

const height = (el: HTMLElement) => getComputedStyle(el).height

/** A top-level link that isn't the current page: 44px, text/primary with a text/muted icon */
export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Dashboard' })
    await expect(link).not.toHaveAttribute('aria-current')
    await expect(height(link)).toBe('44px')
    await expect(link).toHaveClass('text-text-primary')
    await expect(link.querySelector('svg')).toHaveAttribute('width', '20')
  },
}

/** The current page: aria-current, bg/nav-active and the 3px rail, without moving the content */
export const Active: Story = {
  args: { to: '/jobs/active', icon: 'briefcase', children: 'Jobs' },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Jobs' })
    await expect(link).toHaveAttribute('aria-current', 'page')
    const style = getComputedStyle(link)
    await expect(style.borderLeftWidth).toBe('3px')
    await expect(style.paddingLeft).toBe('9px')
    await expect(link).toHaveClass('not-aria-[current=page]:hover:bg-bg-hover')
  },
}

/** Sub level: indented 32px, a 16px icon, and a count Badge. 48px with the count. */
export const SubWithCount: Story = {
  args: { to: '/jobs/unlikely', level: 'sub', icon: 'clock', children: 'Unlikely', count: 12 },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Unlikely 12' })
    await expect(height(link)).toBe('48px')
    await expect(getComputedStyle(link).paddingLeft).toBe('32px')
    await expect(link.querySelector('svg')).toHaveAttribute('width', '16')
  },
}

/** Keyboard: Tab reaches each link, with the focus ring */
export const KeyboardFocus: Story = {
  render: () => (
    <>
      <NavItem to="/" end icon="dashboard">
        Dashboard
      </NavItem>
      <NavItem to="/jobs/active" icon="briefcase">
        Jobs
      </NavItem>
    </>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    const dashboard = canvas.getByRole('link', { name: 'Dashboard' })
    await expect(dashboard).toHaveFocus()
    await waitFor(() => expect(getComputedStyle(dashboard).outlineStyle).toBe('solid'))
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: 'Jobs' })).toHaveFocus()
  },
}

const sidebar = (
  <>
    <NavItem to="/" end icon="dashboard">
      Dashboard
    </NavItem>
    <NavItem to="/jobs" icon="briefcase">
      Jobs
    </NavItem>
    <NavItem to="/jobs/active" level="sub" icon="briefcase" count={14}>
      Active
    </NavItem>
    <NavItem to="/jobs/unlikely" level="sub" icon="clock" count={4}>
      Unlikely
    </NavItem>
    <NavItem to="/jobs/rejected" level="sub" icon="ban" count={6}>
      Rejected
    </NavItem>
  </>
)

/** Both levels together, with Jobs and Active current (the router is on /jobs/active) */
export const InASidebar: Story = {
  render: () => sidebar,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Active 14' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  render: () => sidebar,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('link')).toHaveLength(5)
  },
}
