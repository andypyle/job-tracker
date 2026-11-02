import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { clearToasts, toast } from '../../lib/toast'
import { Button } from '../Button/Button'
import { PageHeader } from '../PageHeader/PageHeader'
import { AppShell } from './AppShell'

// A page tall enough to scroll, so the sticky Sidebar and the fixed Bottom bar can be checked
const page = (
  <>
    <PageHeader
      title="Active applications"
      description="14 in progress · 2 interviewing"
      actions={
        <Button variant="primary" icon="plus" className="max-md:hidden">
          Add application
        </Button>
      }
    />
    <div className="flex flex-col gap-4 px-4 py-8 md:px-10">
      {Array.from({ length: 12 }, (_, i) => (
        <p key={i} className="rounded-sm bg-bg-surface p-5 text-body-base text-text-primary">
          Row {i + 1}
        </p>
      ))}
      <p data-testid="page-end" className="text-body-small text-text-muted">
        End of the page
      </p>
    </div>
  </>
)

const meta = {
  title: 'Layouts/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  args: {
    counts: { active: 14, unlikely: 4, rejected: 6 },
    user: { name: 'Alex Rivera', email: 'alex@example.com' },
    onSignOut: fn(),
    onAddApplication: fn(),
    children: page,
  },
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  beforeEach: () => {
    clearToasts()
    window.scrollTo(0, 0)
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/jobs/active']}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

const bottomBar = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-bottom-bar]') as HTMLElement
// The MobileTopBar comes first; getByRole skips it while it's hidden
const topBar = (canvasElement: HTMLElement) => canvasElement.querySelector('header') as HTMLElement
const isShown = (el: Element) => getComputedStyle(el).display !== 'none'

/** From md: the Sidebar beside the page, no mobile chrome */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const sidebar = canvas.getByRole('complementary')
    await expect(isShown(sidebar)).toBe(true)
    await expect(getComputedStyle(sidebar).width).toBe('240px')
    await expect(within(sidebar).getByRole('link', { name: 'Active 14' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('main')).toContainElement(canvas.getByRole('heading', { level: 1 }))

    // The top bar, the Bottom bar and the floating trigger are all below-md only
    await expect(isShown(topBar(canvasElement))).toBe(false)
    await expect(isShown(bottomBar(canvasElement))).toBe(false)
    await expect(canvas.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    await expect(canvas.getByRole('region', { name: 'Notifications' })).toBeInTheDocument()
  },
}

/** The page scrolls; the Sidebar stays the viewport's height, in place */
export const SidebarStaysPut: Story = {
  play: async ({ canvas }) => {
    const sidebar = canvas.getByRole('complementary')
    await expect(sidebar.getBoundingClientRect().height).toBe(window.innerHeight)
    window.scrollTo(0, document.documentElement.scrollHeight)
    await waitFor(() => expect(window.scrollY).toBeGreaterThan(0))
    await expect(sidebar.getBoundingClientRect().top).toBe(0)
    // Sign out, at the Sidebar's foot, is still on screen
    const signOut = within(sidebar).getByRole('button', { name: 'Sign out' })
    await expect(signOut.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

/** The first Tab reaches a skip link, which moves focus to the page */
export const SkipLink: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    const skip = canvas.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toHaveFocus()
    await expect(getComputedStyle(skip).position).toBe('fixed')
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('main')).toHaveFocus()
  },
}

/** Below md: the top bar, then the page, with the Bottom bar fixed below (Dashboard and Jobs) */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement, args }) => {
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument()
    await expect(isShown(topBar(canvasElement))).toBe(true)
    await expect(topBar(canvasElement).getBoundingClientRect().top).toBe(0)

    // A 68px bar: 12px, the 44px row, 12px; 16px sides and a 12px gap
    const bar = bottomBar(canvasElement)
    const rect = bar.getBoundingClientRect()
    await expect(rect.bottom).toBe(window.innerHeight)
    await expect(rect.height).toBe(68) // the top border takes 1px of the 12px
    const trigger = within(bar).getByRole('button', { name: 'Menu' })
    await expect(getComputedStyle(trigger).position).not.toBe('fixed')
    await expect(trigger.getBoundingClientRect().left).toBe(16)
    const add = within(bar).getByRole('button', { name: 'Add application' })
    await expect(add.getBoundingClientRect().left - trigger.getBoundingClientRect().right).toBe(12)
    await expect(add.getBoundingClientRect().right).toBe(window.innerWidth - 16)
    await expect(add.getBoundingClientRect().height).toBe(44)

    await userEvent.click(add)
    await expect(args.onAddApplication).toHaveBeenCalledOnce()

    // At the end of the page, the last of it clears the bar
    window.scrollTo(0, document.documentElement.scrollHeight)
    await waitFor(() => expect(window.scrollY).toBeGreaterThan(0))
    await expect(canvas.getByTestId('page-end').getBoundingClientRect().bottom).toBeLessThanOrEqual(rect.top)
  },
}

export const PhoneDark: Story = {
  globals: { viewport: { value: 'phone' }, theme: 'dark' },
}

/** Without `onAddApplication` (Application detail) there's no Bottom bar; the trigger floats */
export const PhoneWithoutBottomBar: Story = {
  args: { onAddApplication: undefined },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement }) => {
    await expect(bottomBar(canvasElement)).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Add application' })).not.toBeInTheDocument()
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await expect(getComputedStyle(trigger).position).toBe('fixed')
    await expect(trigger.getBoundingClientRect().bottom).toBe(window.innerHeight - 16)
  },
}

// axe reads text mid-fade as low contrast, so wait for the toast to settle
const settle = () =>
  waitFor(() => expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0))

/** Toasts sit 16px above the Bottom bar rather than over it */
export const ToastClearsBottomBar: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement }) => {
    toast({ tone: 'neutral', title: 'Moved to Interviewing', message: 'Senior Product Designer' })
    const toasts = canvas.getByRole('region', { name: 'Notifications' })
    await settle()
    await expect(bottomBar(canvasElement).getBoundingClientRect().top - toasts.getBoundingClientRect().bottom).toBe(16)
  },
}

/** And 16px above the floating trigger */
export const ToastClearsTrigger: Story = {
  args: { onAddApplication: undefined },
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas }) => {
    toast({ tone: 'neutral', title: 'Application updated' })
    const toasts = canvas.getByRole('region', { name: 'Notifications' })
    await settle()
    const trigger = canvas.getByRole('button', { name: 'Menu' })
    await expect(trigger.getBoundingClientRect().top - toasts.getBoundingClientRect().bottom).toBe(16)
  },
}
