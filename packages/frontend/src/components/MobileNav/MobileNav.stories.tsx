import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { MobileNav } from './MobileNav'

const meta = {
  title: 'Patterns/MobileNav',
  component: MobileNav,
  tags: ['autodocs'],
  args: {
    counts: { active: 14, unlikely: 4, rejected: 6 },
    user: { name: 'Alex Rivera', email: 'alex@example.com' },
    onSignOut: fn(),
  },
  parameters: { layout: 'fullscreen', route: '/' },
  // A phone-height page; the route parameter sets the starting page
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={[parameters.route]}>
        <div className="h-180 bg-bg-canvas">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof MobileNav>

export default meta
type Story = StoryObj<typeof meta>

const panel = () => document.querySelector('dialog') as HTMLDialogElement
// axe reads text mid-fade as low contrast, so plays that leave the panel open wait for its motion
const settle = () => waitFor(() => expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0))
// The dialog is in the top layer, outside the canvas
const inPanel = () => within(panel())

async function openPanel(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole('button', { name: 'Menu' }))
  await waitFor(() => expect(panel().open).toBe(true))
}

/** Closed: the floating trigger, 16px from the bottom-left corner */
export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveAttribute('aria-controls', panel().id)
    await expect(panel().open).toBe(false)
    const style = getComputedStyle(trigger)
    await expect(style.position).toBe('fixed')
    await expect(style.left).toBe('16px')
    await expect(style.bottom).toBe('16px')
    await expect(style.width).toBe('44px')
    await expect(style.height).toBe('44px')
  },
}

/** Open on the dashboard: account at the top, navigation at the bottom near the thumb */
export const Open: Story = {
  play: async ({ canvas }) => {
    await openPanel(canvas)
    await expect(canvas.getByRole('button', { name: 'Menu', hidden: true })).toHaveAttribute('aria-expanded', 'true')
    const dialog = inPanel()
    const nav = within(dialog.getByRole('navigation', { name: 'Main' }))
    const dashboard = nav.getByRole('link', { name: 'Dashboard' })
    await expect(dashboard).toHaveAttribute('aria-current', 'page')
    // Focus starts on the current page, not on Sign out
    await expect(dashboard).toHaveFocus()
    await expect(nav.getByRole('list', { name: 'Jobs' })).toBeInTheDocument()
    await expect(nav.getByRole('link', { name: 'Active 14' })).toHaveAttribute('href', '/jobs/active')
    await expect(nav.getByRole('link', { name: 'Unlikely 4' })).toHaveAttribute('href', '/jobs/unlikely')
    await expect(nav.getByRole('link', { name: 'Rejected 6' })).toHaveAttribute('href', '/jobs/rejected')
    // Visible once the items have faded in
    await settle()
    await expect(dialog.getByText('Alex Rivera')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Sign out' })).toBeVisible()
  },
}

export const OpenDark: Story = {
  ...Open,
  globals: { theme: 'dark' },
}

/** The panel is 280px wide, 8px above the trigger and level with it; the x sits right over it */
export const Placement: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await openPanel(canvas)
    await settle()
    const t = trigger.getBoundingClientRect()
    const box = panel().getBoundingClientRect()
    await expect(getComputedStyle(panel().firstElementChild as HTMLElement).width).toBe('280px')
    await expect(box.left).toBe(t.left)
    await expect(t.top - box.bottom).toBe(8)
    const x = inPanel().getByRole('button', { name: 'Close menu' }).getBoundingClientRect()
    await expect({ left: x.left, top: x.top }).toEqual({ left: t.left, top: t.top })
  },
}

/** Choosing a page closes the panel and returns focus to the trigger */
export const ChoosingAPageCloses: Story = {
  play: async ({ canvas }) => {
    await openPanel(canvas)
    const active = inPanel().getByRole('link', { name: 'Active 14' })
    await userEvent.click(active)
    await waitFor(() => expect(panel().open).toBe(false))
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveFocus()

    // Opening again starts on the new current page
    await openPanel(canvas)
    await expect(inPanel().getByRole('link', { name: 'Active 14' })).toHaveFocus()
    await expect(inPanel().getByRole('link', { name: 'Active 14' })).toHaveAttribute('aria-current', 'page')
    await settle()
  },
}

/** The x, Esc and a tap on the scrim all close it */
export const Closing: Story = {
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole('button', { name: 'Menu' })

    await step('the x', async () => {
      await openPanel(canvas)
      await userEvent.click(inPanel().getByRole('button', { name: 'Close menu' }))
      await waitFor(() => expect(panel().open).toBe(false))
      await expect(trigger).toHaveFocus()
    })

    await step('Esc', async () => {
      await openPanel(canvas)
      // The browser fires `cancel` only for a trusted keypress
      panel().dispatchEvent(new Event('cancel', { cancelable: true }))
      await waitFor(() => expect(panel().open).toBe(false))
      await expect(trigger).toHaveFocus()
    })

    await step('the scrim', async () => {
      await openPanel(canvas)
      // A press on the scrim targets the dialog element itself
      await userEvent.click(panel())
      await waitFor(() => expect(panel().open).toBe(false))
      await expect(trigger).toHaveFocus()
    })
  },
}

/** Sign out closes the panel and calls `onSignOut` */
export const SignOut: Story = {
  play: async ({ canvas, args }) => {
    await openPanel(canvas)
    await userEvent.click(inPanel().getByRole('button', { name: 'Sign out' }))
    await expect(args.onSignOut).toHaveBeenCalledOnce()
    await waitFor(() => expect(panel().open).toBe(false))
  },
}

/** While counts load, the Jobs links have none and keep their 48px height */
export const LoadingCounts: Story = {
  args: { counts: undefined },
  play: async ({ canvas }) => {
    await openPanel(canvas)
    const active = inPanel().getByRole('link', { name: 'Active' })
    await expect(getComputedStyle(active).minHeight).toBe('48px')
    await settle()
  },
}

/**
 * Not floating: the trigger is the first item of a Bottom bar (a stand-in here). The panel
 * still opens 8px above it.
 */
export const InBottomBar: Story = {
  args: { floating: false },
  decorators: [
    (Story) => (
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-3 border-t border-border-subtle bg-bg-surface px-4 py-3">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await expect(getComputedStyle(trigger).position).not.toBe('fixed')
    await openPanel(canvas)
    await settle()
    await expect(trigger.getBoundingClientRect().top - panel().getBoundingClientRect().bottom).toBe(8)
  },
}
