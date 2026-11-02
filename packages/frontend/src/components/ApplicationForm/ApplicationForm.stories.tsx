import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within, type Mock } from 'storybook/test'
import type { Application } from '@jobtracker/shared'
import type { OpenGraphResult } from '../../lib/api'
import { todayISO } from '../../lib/calendarDate'
import { Button } from '../Button/Button'
import { Dialog } from '../Dialog/Dialog'
import { ApplicationForm } from './ApplicationForm'
import type { ApplicationFormProps } from './ApplicationForm.types'

const year = todayISO().slice(0, 4)

const northwind: OpenGraphResult = {
  title: 'Senior Product Designer',
  company: 'Northwind Labs',
  logo_url: 'https://northwindlabs.com/logo.png',
  compensation: '$165k–$190k',
}

// A lookup the play function settles by hand
function deferred() {
  let resolve: (details: OpenGraphResult) => void = () => {}
  const promise = new Promise<OpenGraphResult>((res) => (resolve = res))
  return { promise, resolve }
}
let lookup = deferred()

const saved: Application = {
  id: 'app-1',
  user_id: 'user-1',
  job_post_url: 'https://jobs.northwindlabs.com/designer-412',
  job_title: 'Senior Product Designer',
  company: 'Northwind Labs',
  company_logo_url: 'https://northwindlabs.com/logo.png',
  compensation: '$165k–$190k',
  industry: 'Software',
  is_referral: true,
  resume_path: 'user-1/app-1/resume.pdf',
  date_applied: `${year}-10-02`,
  status: 'Interviewing',
  created_at: `${year}-10-02T09:00:00Z`,
  updated_at: `${year}-10-02T09:00:00Z`,
}

function pdf(name: string, size: number) {
  const file = new File(['%PDF'], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const meta = {
  title: 'Patterns/ApplicationForm',
  component: ApplicationForm,
  tags: ['autodocs'],
  args: {
    id: 'application-form',
    onSubmit: fn(),
    fetchDetails: fn(() => lookup.promise),
  },
  beforeEach: () => {
    lookup = deferred()
  },
  // The dialog body's width (640 minus 24px each side), with the footer's submit button outside the form
  render: (args) => (
    <div className="flex w-148 flex-col gap-6">
      <ApplicationForm {...args} />
      <Button type="submit" form={args.id} className="self-end">
        Save application
      </Button>
    </div>
  ),
} satisfies Meta<typeof ApplicationForm>

export default meta
type Story = StoryObj<typeof meta>

const save = (canvas: ReturnType<typeof within>) => userEvent.click(canvas.getByRole('button', { name: 'Save application' }))

/** Add: today's date and Applied are filled in; title and company are required */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Date applied' })).not.toHaveValue('')
    await expect(canvas.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Applied')
    await expect(canvas.getByRole('textbox', { name: 'Job post URL' })).toHaveAccessibleDescription(
      'Paste a link to fill in the title, company and logo.',
    )

    // Submitting empty shows both errors and focuses the first
    await save(canvas)
    const title = canvas.getByRole('textbox', { name: 'Job title' })
    await waitFor(() => expect(title).toHaveFocus())
    await expect(title).toHaveAccessibleDescription('Enter the job title')
    await expect(canvas.getByRole('textbox', { name: 'Company' })).toHaveAccessibleDescription('Enter the company')
    await expect(args.onSubmit).not.toHaveBeenCalled()

    // Errors update as you fix them
    await userEvent.type(title, 'Designer')
    await expect(title).not.toBeInvalid()
  },
}

/** Pasting a link fills only the fields that are still empty, and never what was typed */
export const FillFromLink: Story = {
  play: async ({ args, canvas, step }) => {
    const company = canvas.getByRole('textbox', { name: 'Company' })
    const url = canvas.getByRole('textbox', { name: 'Job post URL' })

    await step('type a company, then paste a link', async () => {
      await userEvent.type(company, 'Northwind')
      await userEvent.click(url)
      await userEvent.paste('https://jobs.northwindlabs.com/designer-412')
      await waitFor(() => expect(args.fetchDetails).toHaveBeenCalledWith('https://jobs.northwindlabs.com/designer-412'))
      await expect(canvas.getByText('Getting details')).toBeInTheDocument()
      // The spinner sits in the field's trailing slot
      await expect(url.parentElement?.querySelector('[role=status]')).toBeInTheDocument()
    })

    await step('the lookup fills the empty fields', async () => {
      lookup.resolve(northwind)
      await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Job title' })).toHaveValue('Senior Product Designer'))
      await expect(company).toHaveValue('Northwind')
      await expect(canvas.getByRole('textbox', { name: /Compensation/ })).toHaveValue('$165k–$190k')
      await expect(canvas.getByText('Filled in job title and compensation')).toBeInTheDocument()
      await expect(url.parentElement?.querySelector('[role=status]')).not.toBeInTheDocument()
    })

    await step('leaving the field with the same link does not look it up again', async () => {
      await userEvent.tab()
      await expect(args.fetchDetails).toHaveBeenCalledOnce()
    })

    await step('the logo goes with the saved application', async () => {
      await save(canvas)
      await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
      await expect(args.onSubmit).toHaveBeenCalledWith({
        application: {
          job_post_url: 'https://jobs.northwindlabs.com/designer-412',
          job_title: 'Senior Product Designer',
          company: 'Northwind',
          company_logo_url: 'https://northwindlabs.com/logo.png',
          date_applied: todayISO(),
          status: 'Applied',
          industry: undefined,
          compensation: '$165k–$190k',
          is_referral: false,
          notes: undefined,
        },
        resume: undefined,
        coverLetter: undefined,
      })
    })
  },
}

/** A link that isn't http(s) shows an error on leaving the field, and isn't looked up */
export const InvalidLink: Story = {
  play: async ({ args, canvas }) => {
    const url = canvas.getByRole('textbox', { name: 'Job post URL' })
    await userEvent.type(url, 'jobs.northwindlabs.com')
    await userEvent.tab()
    await expect(url).toBeInvalid()
    await expect(url).toHaveAccessibleDescription('Enter a link that starts with http:// or https://')
    await expect(args.fetchDetails).not.toHaveBeenCalled()
  },
}

/** A full Add: status, referral and a résumé come back to the caller */
export const Submit: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Job title' }), '  Staff UX Engineer ')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Company' }), 'Brightline Health')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(canvas.getByRole('option', { name: 'Interviewing' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: 'This was a referral' }))
    const resume = pdf('resume.pdf', 182 * 1024)
    await userEvent.upload(canvas.getByLabelText(/Resume/), resume)
    await expect(await canvas.findByText('resume.pdf')).toBeInTheDocument()

    await save(canvas)
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
    const [values] = submitted(args.onSubmit)
    await expect(values.application).toMatchObject({
      job_title: 'Staff UX Engineer',
      company: 'Brightline Health',
      status: 'Interviewing',
      is_referral: true,
    })
    await expect(values.resume).toBe(resume)
    await expect(values.coverLetter).toBeUndefined()
  },
}

/** Edit: prefilled. Clearing a field sends '' so the update clears it; removing a saved file sends null */
export const Edit: Story = {
  args: { application: saved },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Job title' })).toHaveValue('Senior Product Designer')
    await expect(canvas.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Interviewing')
    await expect(canvas.getByRole('checkbox', { name: 'This was a referral' })).toBeChecked()
    await expect(canvas.getByText('resume.pdf')).toBeInTheDocument()

    // The saved link isn't looked up again when the field is visited
    await userEvent.click(canvas.getByRole('textbox', { name: 'Job post URL' }))
    await userEvent.tab()
    await expect(args.fetchDetails).not.toHaveBeenCalled()

    await userEvent.clear(canvas.getByRole('textbox', { name: /Compensation/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Remove resume.pdf' }))
    // The row fades out (160ms) before the dropzone reports the removal
    await waitFor(() => expect(canvas.queryByText('resume.pdf')).not.toBeInTheDocument())
    await save(canvas)
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
    const [values] = submitted(args.onSubmit)
    await expect(values.application.compensation).toBe('')
    await expect(values.application.industry).toBe('Software')
    await expect(values.resume).toBeNull()
    await expect(values.coverLetter).toBeUndefined()
  },
}

/** A failed save keeps the form open with the reason in an Alert, which takes focus */
export const SaveFails: Story = {
  args: {
    application: saved,
    onSubmit: fn(() => Promise.reject(new Error('We couldn’t save the application. Check your connection and try again.'))),
  },
  play: async ({ canvas }) => {
    await save(canvas)
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent('We couldn’t save the application.')
    await waitFor(() => expect(alert).toHaveFocus())
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))
  },
}

/** Below 496px of form width, the fields stack in one column */
export const Narrow: Story = {
  render: (args) => (
    <div className="w-89.5">
      <ApplicationForm {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'Job title' }).getBoundingClientRect()
    const company = canvas.getByRole('textbox', { name: 'Company' }).getBoundingClientRect()
    await expect(company.top).toBeGreaterThan(title.bottom)
  },
}

// The Figma screen: the form as the Add application dialog's body
function InDialogDemo(args: ApplicationFormProps) {
  const [open, setOpen] = useState(true)
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      size="large"
      title="Add application"
      description="Paste a job link to fill in the details. You can edit everything later."
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={args.id}>
            Save application
          </Button>
        </>
      }
    >
      <ApplicationForm {...args} />
    </Dialog>
  )
}

export const InDialog: Story = {
  args: { application: { ...saved, status: 'Applied', compensation: undefined, industry: undefined } },
  parameters: { layout: 'fullscreen' },
  render: (args) => <InDialogDemo {...args} />,
  play: async () => {
    const dialog = within(document.body).getByRole('dialog', { name: 'Add application' })
    await expect(within(dialog).getByRole('textbox', { name: 'Job title' })).toHaveValue('Senior Product Designer')
    // Focus starts on the link field, not the close button
    await expect(within(dialog).getByRole('textbox', { name: 'Job post URL' })).toHaveFocus()
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))
  },
}

export const InDialogDark: Story = {
  ...InDialog,
  globals: { theme: 'dark' },
}

// What the first submit passed (args.onSubmit is the fn() spy from meta)
const submitted = (onSubmit: ApplicationFormProps['onSubmit']) =>
  (onSubmit as Mock<ApplicationFormProps['onSubmit']>).mock.calls[0]
