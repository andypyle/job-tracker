import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useRef, useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Button } from '../Button/Button'
import { Alert } from './Alert'

const message = 'That email and password don’t match. Check them and try again.'

const meta = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: { children: message },
  argTypes: { tone: { control: 'inline-radio', options: ['danger', 'warning', 'info', 'positive'] } },
  // 400px, as in Figma
  decorators: [
    (Story) => (
      <div className="flex w-100 flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

/** Danger: role="alert", so it's announced at once. 72px with two lines, as in Figma. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const alert = canvas.getByRole('alert')
    await expect(alert).toHaveTextContent(message)
    const style = getComputedStyle(alert)
    await expect(style.height).toBe('72px')
    await expect(style.borderLeftWidth).toBe('3px')
    await expect(style.paddingLeft).toBe('13px')
    await expect(alert.querySelector('svg')).toHaveAttribute('width', '20')
  },
}

/** The other tones are role="status", announced politely */
export const AllTones: Story = {
  render: (args) => (
    <>
      <Alert {...args} tone="danger" />
      <Alert {...args} tone="warning">
        Your session expires in 5 minutes. Save your changes.
      </Alert>
      <Alert {...args} tone="info">
        Details from the job post fill only the fields you left empty.
      </Alert>
      <Alert {...args} tone="positive">
        Your password was reset. Sign in with the new one.
      </Alert>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('alert')).toHaveLength(1)
    await expect(canvas.getAllByRole('status')).toHaveLength(3)
  },
}

function FailedSubmit() {
  const [failed, setFailed] = useState(false)
  const alert = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (failed) alert.current?.focus()
  }, [failed])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setFailed(true)
      }}
    >
      {failed && <Alert ref={alert}>{message}</Alert>}
      <Button type="submit" variant="strong">
        Sign in
      </Button>
    </form>
  )
}

/** After a failed submit the alert appears above the fields and takes focus */
export const FocusAfterSubmit: Story = {
  render: () => <FailedSubmit />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    const alert = await canvas.findByRole('alert')
    await waitFor(() => expect(alert).toHaveFocus())
    await expect(alert).toHaveClass('animate-drop-in')
  },
}

export const Dark: Story = {
  ...AllTones,
  globals: { theme: 'dark' },
}
