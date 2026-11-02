import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Button } from '../Button/Button'
import { Dialog } from './Dialog'

type DialogStoryProps = Omit<ComponentProps<typeof Dialog>, 'open' | 'onClose'> & { trigger?: string }

// A trigger that opens the dialog; the footer's buttons close it
function DialogDemo({ trigger = 'Add application', footer, ...props }: DialogStoryProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{trigger}</Button>
      <Dialog
        {...props}
        open={open}
        onClose={close}
        footer={
          footer ?? (
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button onClick={close}>Save application</Button>
            </>
          )
        }
      />
    </>
  )
}

const body = (
  <p className="text-body-base text-text-muted">
    The form goes here: a job link that fills in the details, then company, role and status.
  </p>
)

const longBody = (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 12 }, (_, i) => (
      <p key={i} className="text-body-base">
        Paragraph {i + 1}. A long body scrolls on its own between the fixed header and footer.
      </p>
    ))}
  </div>
)

const meta = {
  title: 'Components/Dialog',
  component: DialogDemo,
  tags: ['autodocs'],
  args: {
    title: 'Add application',
    description: 'Paste a job link to fill in the details.',
    children: body,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    children: { control: false },
    footer: { control: false },
  },
} satisfies Meta<typeof DialogDemo>

export default meta
type Story = StoryObj<typeof meta>

const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

// Esc: the browser fires `cancel` only for a trusted keypress, and testing-library's keyboard
// events aren't trusted, so send the event a real Esc produces
const pressEscape = (dialog: HTMLElement) => dialog.dispatchEvent(new Event('cancel', { cancelable: true }))

const opened = (dialog: HTMLElement) => waitFor(() => expect(getComputedStyle(dialog).opacity).toBe('1'))

/** Medium (560px). Opens as a modal; Esc closes it and focus returns to the trigger. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('button', { name: 'Add application' })
    await userEvent.click(trigger)

    const dialog = await page(canvasElement).findByRole('dialog', { name: 'Add application' })
    await expect(dialog).toHaveAccessibleDescription('Paste a job link to fill in the details.')
    await expect((dialog as HTMLDialogElement).open).toBe(true)
    await expect(getComputedStyle(dialog).width).toBe('560px')
    await opened(dialog)
    // A short body isn't a tab stop
    await expect(dialog.querySelector('[data-dialog-body]')).not.toHaveAttribute('tabindex')

    pressEscape(dialog)
    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false))
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

/** The close button and a press on the scrim both close it */
export const CloseButtonAndScrim: Story = {
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('button', { name: 'Add application' })
    await userEvent.click(trigger)
    const dialog = (await page(canvasElement).findByRole('dialog')) as HTMLDialogElement
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(dialog.open).toBe(false))

    await userEvent.click(trigger)
    await waitFor(() => expect(dialog.open).toBe(true))
    // A press on the scrim lands on the <dialog> itself
    await userEvent.click(dialog)
    await waitFor(() => expect(dialog.open).toBe(false))
  },
}

/** Small (400px) and large (640px) from md */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex gap-3">
      <DialogDemo {...args} size="small" trigger="Small" />
      <DialogDemo {...args} size="large" trigger="Large" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Small' }))
    const small = await page(canvasElement).findByRole('dialog')
    await expect(getComputedStyle(small).width).toBe('400px')
    pressEscape(small)
    await waitFor(() => expect((small as HTMLDialogElement).open).toBe(false))

    await userEvent.click(canvas.getByRole('button', { name: 'Large' }))
    const large = await page(canvasElement).findByRole('dialog')
    await expect(getComputedStyle(large).width).toBe('640px')
  },
}

/** The body scrolls on its own; a divider appears under the header once it has */
export const ScrollingBody: Story = {
  args: { children: longBody },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add application' }))
    const dialog = await page(canvasElement).findByRole('dialog')
    await opened(dialog)
    const scroller = dialog.querySelector('[data-dialog-body]') as HTMLElement
    const header = dialog.firstElementChild as HTMLElement
    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    // With nothing focusable inside, the body itself is the tab stop for keyboard scrolling
    await waitFor(() => expect(scroller).toHaveAttribute('tabindex', '0'))
    await expect(header).toHaveClass('border-transparent')

    scroller.scrollTop = 120
    await waitFor(() => expect(header).toHaveClass('border-border-divider'))
    // The footer stays put
    await expect(within(dialog).getByRole('button', { name: 'Save application' })).toBeVisible()
  },
}

/**
 * A confirmation: role="alertdialog", no close button, the scrim does nothing, and focus starts
 * on the safe action
 */
export const AlertDialog: Story = {
  args: {
    role: 'alertdialog',
    size: 'small',
    trigger: 'Delete',
    title: 'Delete this application?',
    description: 'Senior Product Designer at Northwind Labs. This can’t be undone.',
    children: undefined,
  },
  render: function Render(args) {
    const [open, setOpen] = useState(false)
    const close = () => setOpen(false)
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete
        </Button>
        <Dialog
          {...args}
          open={open}
          onClose={close}
          footer={
            <>
              <Button variant="secondary" autoFocus onClick={close}>
                Cancel
              </Button>
              <Button variant="danger" onClick={close}>
                Delete application
              </Button>
            </>
          }
        />
      </>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const dialog = (await page(canvasElement).findByRole('alertdialog', { name: 'Delete this application?' })) as HTMLDialogElement
    await expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus())

    await userEvent.click(dialog)
    await expect(dialog.open).toBe(true)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add application' }))
    await opened(await page(canvasElement).findByRole('dialog'))
  },
}
