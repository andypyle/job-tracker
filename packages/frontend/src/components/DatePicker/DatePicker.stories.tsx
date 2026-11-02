import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { todayISO } from '../../lib/calendarDate'
import { FormField } from '../FormField/FormField'
import { DatePicker } from './DatePicker'

const meta = {
  title: 'Components/Forms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Date applied',
    weekStart: 0,
    onChange: fn(),
    onInvalidInput: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-[34rem] w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

const dialogOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('dialog', { hidden: true })
const isOpen = (dialog: HTMLElement) => dialog.matches(':popover-open')

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByRole('textbox', { name: 'Date applied' })
    await expect(input).toHaveValue('')
    await expect(input.parentElement!.getBoundingClientRect().height).toBe(48)
    // The calendar button opens a dialog, which starts closed
    await expect(canvas.getByRole('button', { name: 'Choose date' })).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(isOpen(dialogOf(canvasElement))).toBe(false)
  },
}

export const Typing: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Date applied' })
    await expect(input).toHaveAttribute('placeholder', 'e.g. Oct 21')
    // Read on blur and formatted
    await userEvent.type(input, '10/21/2026')
    await userEvent.tab()
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-10-21')
    await expect(input).toHaveValue('Oct 21, 2026')
    // Enter reads it too
    await userEvent.clear(input)
    await userEvent.type(input, 'Sep 3 2026{Enter}')
    await expect(args.onChange).toHaveBeenLastCalledWith('2026-09-03')
    await expect(input).toHaveValue('Sep 3, 2026')
    // Emptying the field clears the value
    await userEvent.clear(input)
    await userEvent.tab()
    await expect(args.onChange).toHaveBeenLastCalledWith(null)
  },
}

export const InvalidInput: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox')
    await userEvent.type(input, 'next Tuesday')
    await userEvent.tab()
    await expect(input).toBeInvalid()
    await expect(input).toHaveValue('next Tuesday')
    await expect(args.onInvalidInput).toHaveBeenCalledWith('next Tuesday')
    await expect(args.onChange).not.toHaveBeenCalled()
    // Fixing the text clears the error
    await userEvent.clear(input)
    await userEvent.type(input, 'Oct 21, 2026')
    await userEvent.tab()
    await expect(input).toBeValid()
    await expect(args.onChange).toHaveBeenCalledWith('2026-10-21')
  },
}

export const PickWithPointer: Story = {
  args: { defaultValue: '2026-10-21' },
  play: async ({ args, canvas, canvasElement }) => {
    const input = canvas.getByRole('textbox')
    const button = canvas.getByRole('button', { name: 'Choose date' })
    const dialog = dialogOf(canvasElement)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toHaveAttribute('aria-controls', dialog.id)

    await userEvent.click(button)
    await expect(isOpen(dialog)).toBe(true)
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    // Focus opens on the selected day, inside a grid named by the month
    const grid = within(dialog).getByRole('grid', { name: 'October 2026' })
    const selected = within(grid).getByRole('button', { name: 'Wednesday, October 21, 2026' })
    await waitFor(() => expect(selected).toHaveFocus())
    await expect(selected.parentElement).toHaveAttribute('aria-selected', 'true')
    // 332px wide: 7 × 44 plus padding, plus the border
    await expect(Math.round(dialog.getBoundingClientRect().width)).toBe(334)
    await expect(within(grid).getAllByRole('row')).toHaveLength(7)

    // Outside days are selectable
    await userEvent.click(within(grid).getByRole('button', { name: 'Sunday, September 27, 2026' }))
    await expect(args.onChange).toHaveBeenCalledOnce()
    await expect(args.onChange).toHaveBeenCalledWith('2026-09-27')
    await expect(input).toHaveValue('Sep 27, 2026')
    // It closes 80ms later and focus returns to the field
    await waitFor(() => expect(isOpen(dialog)).toBe(false))
    await expect(input).toHaveFocus()

    // The month buttons change month without moving focus
    await userEvent.click(button)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next month' }))
    await expect(within(dialog).getByRole('grid', { name: 'October 2026' })).toBeInTheDocument()
    await expect(within(dialog).getByRole('button', { name: 'Next month' })).toHaveFocus()
    // A press outside closes it
    await userEvent.click(document.body)
    await expect(isOpen(dialog)).toBe(false)
  },
}

export const Keyboard: Story = {
  args: { defaultValue: '2026-10-21' },
  render: (args) => (
    <>
      <DatePicker {...args} />
      <button type="button" className="mt-4">
        After
      </button>
    </>
  ),
  play: async ({ args, canvas, canvasElement }) => {
    const dialog = dialogOf(canvasElement)
    const button = canvas.getByRole('button', { name: 'Choose date' })
    const expectFocusOn = (name: string) =>
      waitFor(() => expect(within(dialog).getByRole('button', { name })).toHaveFocus())

    button.focus()
    await userEvent.keyboard('{Enter}')
    await expectFocusOn('Wednesday, October 21, 2026')
    // Arrows move by day and week; one day has tabindex 0 (roving)
    await userEvent.keyboard('{ArrowRight}')
    await expectFocusOn('Thursday, October 22, 2026')
    await expect(within(dialog).getByRole('button', { name: 'Thursday, October 22, 2026' })).toHaveAttribute('tabindex', '0')
    await expect(within(dialog).getByRole('button', { name: 'Wednesday, October 21, 2026' })).toHaveAttribute('tabindex', '-1')
    await userEvent.keyboard('{ArrowDown}')
    await expectFocusOn('Thursday, October 29, 2026')
    // Home and End go to the start and end of the week
    await userEvent.keyboard('{End}')
    await expectFocusOn('Saturday, October 31, 2026')
    await userEvent.keyboard('{Home}')
    await expectFocusOn('Sunday, October 25, 2026')
    // Crossing into the next month changes the grid
    await userEvent.keyboard('{ArrowDown}')
    await expectFocusOn('Sunday, November 1, 2026')
    await expect(within(dialog).getByRole('grid')).toHaveAccessibleName('November 2026')
    // PageUp and PageDown change month; with Shift, year
    await userEvent.keyboard('{PageDown}')
    await expectFocusOn('Tuesday, December 1, 2026')
    await userEvent.keyboard('{Shift>}{PageUp}{/Shift}')
    await expectFocusOn('Monday, December 1, 2025')
    await userEvent.keyboard('{PageUp}')
    await expectFocusOn('Saturday, November 1, 2025')

    // Enter selects, closes, and focus returns to the field
    await userEvent.keyboard('{Enter}')
    await expect(args.onChange).toHaveBeenLastCalledWith('2025-11-01')
    await waitFor(() => expect(isOpen(dialog)).toBe(false))
    await expect(canvas.getByRole('textbox')).toHaveFocus()

    // Esc closes and returns focus to the calendar button
    button.focus()
    await userEvent.keyboard(' ')
    await expectFocusOn('Saturday, November 1, 2025')
    await userEvent.keyboard('{Escape}')
    await expect(isOpen(dialog)).toBe(false)
    await expect(button).toHaveFocus()

    // Tab moves through the calendar (day, Today, Clear), and leaving it closes it
    await userEvent.keyboard('{Enter}')
    await expectFocusOn('Saturday, November 1, 2025')
    await userEvent.tab()
    await expect(within(dialog).getByRole('button', { name: 'Today' })).toHaveFocus()
    await userEvent.tab()
    await expect(within(dialog).getByRole('button', { name: 'Clear' })).toHaveFocus()
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus()
    await expect(isOpen(dialog)).toBe(false)
    await expect(args.onChange).toHaveBeenCalledOnce()
  },
}

export const TodayAndClear: Story = {
  args: { defaultValue: '2026-10-21' },
  play: async ({ args, canvas, canvasElement }) => {
    const dialog = dialogOf(canvasElement)
    const input = canvas.getByRole('textbox')
    await userEvent.click(canvas.getByRole('button', { name: 'Choose date' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear' }))
    await expect(args.onChange).toHaveBeenLastCalledWith(null)
    await expect(input).toHaveValue('')
    await expect(isOpen(dialog)).toBe(false)
    await expect(input).toHaveFocus()

    // With no value, focus opens on today, marked aria-current
    await userEvent.click(canvas.getByRole('button', { name: 'Choose date' }))
    await waitFor(() => expect(dialog.querySelector(`[data-date="${todayISO()}"]`)).toHaveFocus())
    await expect(dialog.querySelector(`[data-date="${todayISO()}"]`)).toHaveAttribute('aria-current', 'date')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Today' }))
    await expect(args.onChange).toHaveBeenLastCalledWith(todayISO())
  },
}

// "Date applied": future days are disabled, since you can't have applied tomorrow
export const NoFutureDates: Story = {
  args: { defaultValue: '2026-10-20', max: '2026-10-21' },
  play: async ({ args, canvas, canvasElement }) => {
    const dialog = dialogOf(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Choose date' }))
    const future = within(dialog).getByRole('button', { name: 'Thursday, October 22, 2026' })
    await expect(future).toHaveAttribute('aria-disabled', 'true')
    // Strikethrough, so it isn't shown by color alone
    await expect(getComputedStyle(future).textDecorationLine).toBe('line-through')
    await userEvent.click(future)
    await expect(args.onChange).not.toHaveBeenCalled()
    await expect(isOpen(dialog)).toBe(true)
    // The keyboard can still move across disabled days
    future.focus()
    await userEvent.keyboard('{ArrowLeft}{Enter}')
    await expect(args.onChange).toHaveBeenCalledWith('2026-10-21')

    // Typed dates past the max are invalid too
    const input = canvas.getByRole('textbox')
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.clear(input)
    await userEvent.type(input, 'Oct 25, 2026')
    await userEvent.tab()
    await expect(input).toBeInvalid()
    await expect(args.onInvalidInput).toHaveBeenCalledWith('Oct 25, 2026')
  },
}

export const MondayFirst: Story = {
  args: { defaultValue: '2026-10-21', weekStart: 1 },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Choose date' }))
    const headers = within(dialogOf(canvasElement)).getAllByRole('columnheader')
    await expect(headers[0]).toHaveAccessibleName('Monday')
    await expect(headers[0]).toHaveTextContent('Mo')
    await expect(headers[6]).toHaveAccessibleName('Sunday')
  },
}

export const InFormField: Story = {
  args: { 'aria-label': undefined },
  render: function Render(args) {
    const [error, setError] = useState<string>()
    return (
      <FormField label="Date applied" error={error} hint="Type a date or pick one">
        <DatePicker
          {...args}
          onChange={(value) => {
            setError(undefined)
            args.onChange?.(value)
          }}
          onInvalidInput={() => setError('Enter a date like Oct 21, 2026')}
        />
      </FormField>
    )
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Date applied' })
    await expect(input).toHaveAccessibleDescription('Type a date or pick one')
    await userEvent.type(input, 'Oct 32')
    await userEvent.tab()
    await expect(input).toBeInvalid()
    await expect(input).toHaveAccessibleDescription('Enter a date like Oct 21, 2026')
  },
}

export const NativeForm: Story = {
  args: { name: 'date_applied', defaultValue: '2026-10-21' },
  render: (args) => (
    <form aria-label="Application">
      <DatePicker {...args} />
    </form>
  ),
  play: async ({ canvas }) => {
    const form = canvas.getByRole('form') as HTMLFormElement
    // The form gets YYYY-MM-DD, not the display text
    await expect(new FormData(form).get('date_applied')).toBe('2026-10-21')
  },
}

export const States: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <DatePicker {...args} aria-label="Empty" />
      <DatePicker {...args} aria-label="Filled" defaultValue="2026-10-21" />
      <DatePicker {...args} aria-label="Error" defaultValue="2026-10-21" aria-invalid />
      <DatePicker {...args} aria-label="Disabled" defaultValue="2026-10-21" disabled />
    </div>
  ),
}

export const StatesDark: Story = {
  ...States,
  globals: { theme: 'dark' },
}

// The open calendar, like the Figma "open Date applied" examples
export const Open: Story = {
  args: { defaultValue: '2026-10-21' },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Choose date' }))
    const dialog = dialogOf(canvasElement)
    await userEvent.hover(within(dialog).getByRole('button', { name: 'Wednesday, October 14, 2026' }))
  },
}

export const OpenDark: Story = {
  ...Open,
  globals: { theme: 'dark' },
}
