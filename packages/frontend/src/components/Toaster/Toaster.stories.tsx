import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { clearToasts, toast, type ToastOptions } from '../../lib/toast'
import { Button } from '../Button/Button'
import { Toaster } from './Toaster'

const samples: ToastOptions[] = [
  { title: 'Application saved', message: 'Senior Product Designer · Northwind Labs' },
  { tone: 'positive', title: 'Moved to Interviewing' },
  { tone: 'warning', title: 'Logo not found', message: 'Showing initials instead' },
  { tone: 'danger', title: 'Couldn’t save the application', message: 'Check your connection and try again' },
]

const onUndo = fn()
let shown = 0

const meta = {
  title: 'Components/Feedback/Toaster',
  component: Toaster,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  beforeEach: () => {
    clearToasts()
    shown = 0
  },
  // Buttons that call toast(); the Toaster sits bottom-right as in the app
  render: () => (
    <div className="flex min-h-screen flex-wrap items-start gap-3 bg-bg-canvas p-6">
      <Button onClick={() => toast(samples[shown++ % samples.length])}>Show toast</Button>
      <Button
        variant="secondary"
        onClick={() => toast({ tone: 'positive', title: 'Application deleted', action: { label: 'Undo', onClick: onUndo } })}
      >
        Delete
      </Button>
      <Button variant="secondary" onClick={() => toast({ title: 'Quick one', duration: 400 })}>
        Short toast
      </Button>
      <Toaster />
    </div>
  ),
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

const region = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('section[aria-label="Notifications"]') as HTMLElement
// Let enter and exit animations finish, so the a11y check after the play sees full opacity
const settle = async (canvasElement: HTMLElement) => {
  await waitFor(() => expect(toasts(canvasElement).length).toBeLessThanOrEqual(3))
  await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))
}

const toasts = (canvasElement: HTMLElement) => Array.from(region(canvasElement).querySelectorAll('[role=status], [role=alert]'))

/** A toast enters at the bottom right of the Notifications region */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('region', { name: 'Notifications' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }))
    const toast = await canvas.findByRole('status')
    await expect(toast).toHaveTextContent('Application saved')
    await settle(canvasElement)
    // Focus stays where it was
    await expect(canvas.getByRole('button', { name: 'Show toast' })).toHaveFocus()
    const box = region(canvasElement).getBoundingClientRect()
    await expect(Math.round(window.innerWidth - box.right)).toBe(24)
  },
}

/** Newest at the bottom; a 4th pushes the oldest out, which leaves and is removed */
export const Stacking: Story = {
  play: async ({ canvas, canvasElement }) => {
    const show = canvas.getByRole('button', { name: 'Show toast' })
    for (let i = 0; i < 4; i++) await userEvent.click(show)
    await waitFor(() => expect(toasts(canvasElement)).toHaveLength(3))
    const titles = toasts(canvasElement).map((t) => t.querySelector('p')?.textContent)
    await expect(titles).toEqual(['Moved to Interviewing', 'Logo not found', 'Couldn’t save the application'])
    await settle(canvasElement)
  },
}

/** The dismiss button starts the exit; the toast is removed when it ends */
export const Dismiss: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Dismiss notification' }))
    await waitFor(() => expect(toasts(canvasElement)).toHaveLength(0))
  },
}

/** An action runs, then closes its toast */
export const Action: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Undo' }))
    await expect(onUndo).toHaveBeenCalledOnce()
    await waitFor(() => expect(toasts(canvasElement)).toHaveLength(0))
  },
}

/** Toasts time out, but the timer holds while the stack is hovered */
export const TimeoutAndPause: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Short toast' }))
    const toast = await canvas.findByRole('status')
    await userEvent.hover(toast)
    await new Promise((resolve) => setTimeout(resolve, 700))
    await expect(toasts(canvasElement)).toHaveLength(1)

    await userEvent.unhover(toast)
    await waitFor(() => expect(toasts(canvasElement)).toHaveLength(0), { timeout: 2000 })
  },
}

/** Danger stays until dismissed */
export const DangerStays: Story = {
  play: async ({ canvas, canvasElement }) => {
    const show = canvas.getByRole('button', { name: 'Show toast' })
    for (let i = 0; i < 4; i++) await userEvent.click(show)
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('Couldn’t save the application')
    await settle(canvasElement)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvas, canvasElement }) => {
    const show = canvas.getByRole('button', { name: 'Show toast' })
    for (let i = 0; i < 3; i++) await userEvent.click(show)
    await waitFor(() => expect(toasts(canvasElement)).toHaveLength(3))
    await settle(canvasElement)
  },
}
