import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Application } from '@jobtracker/shared'
import type { OpenGraphResult } from '../../lib/api'
import { todayISO } from '../../lib/calendarDate'
import { Button } from '../Button/Button'
import { ApplicationDialog } from './ApplicationDialog'
import type { ApplicationDialogProps } from './ApplicationDialog.types'

const year = todayISO().slice(0, 4)

const saved: Application = {
  id: 'app-1',
  user_id: 'user-1',
  job_post_url: 'https://jobs.northwindlabs.com/designer-412',
  job_title: 'Senior Product Designer',
  company: 'Northwind Labs',
  compensation: '$165k–$190k',
  industry: 'Software',
  is_referral: true,
  resume_path: 'user-1/app-1/resume.pdf',
  date_applied: `${year}-10-02`,
  status: 'Interviewing',
  created_at: `${year}-10-02T09:00:00Z`,
  updated_at: `${year}-10-02T09:00:00Z`,
}

// A promise the play function settles by hand
function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (error: Error) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
let lookup = deferred<OpenGraphResult>()
let save = deferred<void>()

// Opened from a trigger, as the app does: the dialog closes once the save resolves
function Demo(args: ApplicationDialogProps) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{args.application ? 'Edit' : 'Add application'}</Button>
      <ApplicationDialog
        {...args}
        open={open}
        onClose={() => {
          args.onClose()
          setOpen(false)
        }}
        onSubmit={async (values) => {
          await args.onSubmit(values)
          setOpen(false)
        }}
      />
    </>
  )
}

const meta = {
  title: 'Patterns/ApplicationDialog',
  component: ApplicationDialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onClose: fn(),
    onSubmit: fn(() => Promise.resolve()),
    fetchDetails: fn(() => lookup.promise),
  },
  beforeEach: () => {
    lookup = deferred()
    save = deferred()
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ApplicationDialog>

export default meta
type Story = StoryObj<typeof meta>

const dialog = (name: string) => within(document.body).getByRole('dialog', { name })
// Waits for the enter motion (axe reads text mid-fade as low contrast); skips endless ones like the Spinner
const settle = () =>
  Promise.all(
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})),
  )

/** Add: the Figma screen. Focus starts on the link field, since pasting it is the first step. */
export const Default: Story = {
  play: async () => {
    const add = dialog('Add application')
    await expect(add).toHaveAccessibleDescription('Paste a job link to fill in the details. You can edit everything later.')
    await expect(within(add).getByRole('textbox', { name: 'Job post URL' })).toHaveFocus()
    await expect(within(add).getByRole('textbox', { name: 'Job title' })).toHaveValue('')
    await expect(within(add).getByRole('button', { name: 'Save application' })).toBeEnabled()
    await settle()
  },
}

export const Dark: Story = {
  ...Default,
  globals: { theme: 'dark' },
}

/** Edit: the same dialog, prefilled, with its own title and button */
export const Edit: Story = {
  args: { application: saved },
  play: async ({ args }) => {
    const edit = dialog('Edit application')
    await expect(within(edit).getByRole('textbox', { name: 'Job title' })).toHaveValue('Senior Product Designer')
    await expect(within(edit).getByText('resume.pdf')).toBeInTheDocument()

    await userEvent.click(within(edit).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
    // The form sends every field on Edit, so a cleared one is cleared on the server
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ application: expect.objectContaining({ job_title: 'Senior Product Designer', notes: '' }) }),
    )
    await waitFor(() => expect(edit).not.toBeVisible())
  },
}

export const EditDark: Story = {
  args: { application: saved },
  globals: { theme: 'dark' },
  play: async () => {
    await settle()
    await waitFor(() => expect(dialog('Edit application')).toBeVisible())
  },
}

/** While saving, the button says so and the dialog can't be closed; it closes when the save resolves */
export const Saving: Story = {
  args: { application: saved, onSubmit: fn(() => save.promise) },
  play: async ({ args }) => {
    await settle()
    const edit = dialog('Edit application')

    await userEvent.click(within(edit).getByRole('button', { name: 'Save changes' }))
    const saving = await within(edit).findByRole('button', { name: 'Saving…' })
    await expect(saving).toBeDisabled()
    await expect(within(edit).getByRole('button', { name: 'Cancel' })).toBeDisabled()

    await userEvent.click(within(edit).getByRole('button', { name: 'Close' }))
    await expect(args.onClose).not.toHaveBeenCalled()
    await expect(edit).toBeVisible()

    save.resolve()
    await waitFor(() => expect(edit).not.toBeVisible())
  },
}

/** A failed save keeps the dialog open, with the reason above the fields */
export const SaveFails: Story = {
  args: {
    application: saved,
    onSubmit: fn(() => Promise.reject(new Error('We couldn’t save the application. Check your connection and try again.'))),
  },
  play: async () => {
    const edit = dialog('Edit application')
    await userEvent.click(within(edit).getByRole('button', { name: 'Save changes' }))
    const alert = await within(edit).findByRole('alert')
    await expect(alert).toHaveTextContent('We couldn’t save the application.')
    await expect(within(edit).getByRole('button', { name: 'Save changes' })).toBeEnabled()
    await settle()
  },
}

/** Each opening starts fresh: a cancelled Add doesn't come back half-filled */
export const ReopensEmpty: Story = {
  play: async ({ canvas }) => {
    const add = dialog('Add application')
    await userEvent.type(within(add).getByRole('textbox', { name: 'Job title' }), 'Designer')
    await userEvent.click(within(add).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(add).not.toBeVisible())

    const trigger = canvas.getByRole('button', { name: 'Add application' })
    // The browser hands focus back to what had it before (here, nothing was focused first)
    await userEvent.click(trigger)
    await waitFor(() => expect(add).toBeVisible())
    await expect(within(add).getByRole('textbox', { name: 'Job title' })).toHaveValue('')
    await settle()
  },
}

/** Figma's "fetching" frame: the spinner sits in the link field while details load */
export const Fetching: Story = {
  play: async ({ args }) => {
    const add = dialog('Add application')
    const url = within(add).getByRole('textbox', { name: 'Job post URL' })
    await userEvent.click(url)
    await userEvent.paste('https://jobs.northwindlabs.com/designer-412')
    await waitFor(() => expect(args.fetchDetails).toHaveBeenCalledOnce())
    await expect(url.parentElement?.querySelector('[role=status]')).toBeInTheDocument()
    await settle()
  },
}

/** Below md it's a sheet from the bottom, with full-width buttons */
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
  play: async () => {
    const add = dialog('Add application')
    await settle()
    const sheet = add.getBoundingClientRect()
    await expect(sheet.width).toBe(window.innerWidth)
    await expect(Math.round(sheet.bottom)).toBe(window.innerHeight)
    // The buttons share the footer's width, 24px in from each side
    const cancel = within(add).getByRole('button', { name: 'Cancel' }).getBoundingClientRect()
    const save = within(add).getByRole('button', { name: 'Save application' }).getBoundingClientRect()
    await expect(Math.round(cancel.left)).toBe(24)
    await expect(Math.round(save.right)).toBe(window.innerWidth - 24)
  },
}

export const PhoneDark: Story = {
  ...Phone,
  globals: { viewport: { value: 'phone' }, theme: 'dark' },
}
