import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { ApplicationStatus } from '@jobtracker/shared'
import { clearToasts } from '../../lib/toast'
import { Toaster } from '../Toaster/Toaster'
import { StatusSelect } from './StatusSelect'
import type { StatusSelectProps } from './StatusSelect.types'

// Owns the value like the app does: onChange's result decides when it changes
function Controlled({ value: initial, onChange, ...props }: StatusSelectProps) {
  const [value, setValue] = useState(initial)
  return (
    <StatusSelect
      {...props}
      value={value}
      onChange={(status) => {
        const result = onChange(status)
        if (result instanceof Promise) return result.then(() => setValue(status))
        setValue(status)
      }}
    />
  )
}

// A save the play function settles by hand
function deferred() {
  let resolve = () => {}
  let reject: (reason: Error) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
let save = deferred()

const meta = {
  title: 'Components/StatusSelect',
  component: StatusSelect,
  tags: ['autodocs'],
  args: {
    value: 'Applied',
    onChange: fn(),
  },
  beforeEach: () => {
    clearToasts()
    save = deferred()
  },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div className="h-80">
        <Story />
        <Toaster />
      </div>
    ),
  ],
} satisfies Meta<typeof StatusSelect>

export default meta
type Story = StoryObj<typeof meta>

const notifications = () => within(document.querySelector('section[aria-label="Notifications"]') as HTMLElement)
// Let toast motion finish, so the a11y check after the play sees full opacity
const settle = () => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await expect(trigger).toHaveTextContent('Applied')

    await userEvent.click(trigger)
    const listbox = canvas.getByRole('listbox')
    // Figma's menu order
    await expect(within(listbox).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Applied',
      'Interviewing',
      'Offer',
      'Rejected',
      'Unlikely',
      'Role Eliminated',
    ])
    await userEvent.click(within(listbox).getByRole('option', { name: 'Interviewing' }))
    await expect(args.onChange).toHaveBeenCalledWith('Interviewing')
    await expect(trigger).toHaveTextContent('Interviewing')

    // A neutral toast with Undo, which puts the old status back
    const toast = await notifications().findByRole('status')
    await expect(toast).toHaveTextContent('Moved to Interviewing')
    await userEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('Applied')
    await expect(trigger).toHaveTextContent('Applied')
    // Undoing doesn't toast again
    await waitFor(() => expect(notifications().queryByRole('status')).not.toBeInTheDocument())
  },
}

/** Every status, drawn with the tones from `STATUS_TONES` */
export const AllStatuses: Story = {
  render: (args) => (
    <div className="flex w-95 flex-wrap gap-2">
      {(['Applied', 'Interviewing', 'Offer', 'Rejected', 'Unlikely', 'Role Eliminated'] as const).map((status) => (
        <StatusSelect key={status} {...args} value={status} aria-label={`Status ${status}`} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('combobox')).toHaveLength(6)
  },
}

export const AllStatusesDark: Story = {
  ...AllStatuses,
  globals: { theme: 'dark' },
}

/** The application's name goes into the label and the toast */
export const WithApplicationName: Story = {
  args: { applicationName: 'Product Designer at Acme' },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status: Product Designer at Acme' })
    await userEvent.click(trigger)
    await userEvent.click(canvas.getByRole('option', { name: 'Offer' }))
    const toast = await notifications().findByRole('status')
    await expect(toast).toHaveTextContent('Moved to Offer')
    await expect(toast).toHaveTextContent('Product Designer at Acme')
    await settle()
  },
}

/** While the change saves, the new status shows busy; focus stays on the trigger */
export const Saving: Story = {
  args: { onChange: fn(() => save.promise) },
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await userEvent.click(trigger)
    await userEvent.click(canvas.getByRole('option', { name: 'Rejected' }))

    await step('saving', async () => {
      await expect(trigger).toHaveTextContent('Rejected')
      await expect(trigger).toHaveAttribute('aria-busy', 'true')
      await expect(trigger).toHaveAttribute('aria-disabled', 'true')
      await expect(trigger).toHaveFocus()
      await expect(getComputedStyle(trigger).opacity).toBe('0.5')
      // It ignores input until the save settles
      await userEvent.click(trigger)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await userEvent.keyboard('{Enter}')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(notifications().queryByRole('status')).not.toBeInTheDocument()
    })

    await step('saved', async () => {
      save.resolve()
      await waitFor(() => expect(trigger).not.toHaveAttribute('aria-busy'))
      await expect(trigger).toHaveTextContent('Rejected')
      await expect(trigger).toHaveFocus()
      await expect(await notifications().findByRole('status')).toHaveTextContent('Moved to Rejected')
      await settle()
    })
  },
}

/** A failed save puts the old status back without a toast; the caller reports the error */
export const SaveFails: Story = {
  args: { value: 'Interviewing', onChange: fn(() => save.promise) },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await userEvent.click(trigger)
    await userEvent.click(canvas.getByRole('option', { name: 'Offer' }))
    await expect(trigger).toHaveTextContent('Offer')

    save.reject(new Error('Network error'))
    await waitFor(() => expect(trigger).not.toHaveAttribute('aria-busy'))
    await expect(trigger).toHaveTextContent('Interviewing')
    await expect(notifications().queryByRole('status')).not.toBeInTheDocument()
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Status' })).toBeDisabled()
  },
}

/** Open on Interviewing with Offer highlighted, as in the Figma frame */
export const Open: Story = {
  args: { value: 'Interviewing' as ApplicationStatus },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
    await userEvent.hover(canvas.getByRole('option', { name: 'Offer' }))
  },
}

export const OpenDark: Story = {
  ...Open,
  globals: { theme: 'dark' },
}
