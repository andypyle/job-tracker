import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { FormField } from '../FormField/FormField'
import { Select } from './Select'
import type { SelectOption } from './Select.types'

const statuses: SelectOption[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'role_eliminated', label: 'Role Eliminated', disabled: true },
]

// The statusBadge example from the Figma Badge description
const statusBadges: SelectOption[] = [
  { value: 'applied', label: 'Applied', tone: 'info' },
  { value: 'interviewing', label: 'Interviewing', tone: 'warning' },
  { value: 'offer', label: 'Offer', tone: 'positive' },
  { value: 'rejected', label: 'Rejected', tone: 'danger', badgeAppearance: 'soft' },
  { value: 'unlikely', label: 'Unlikely', tone: 'neutral', badgeAppearance: 'soft' },
  { value: 'role_eliminated', label: 'Role Eliminated', tone: 'neutral', badgeAppearance: 'outline' },
]

const meta = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    options: statuses,
    placeholder: 'Choose a status',
    'aria-label': 'Status',
    onChange: fn(),
    onBlur: fn(),
  },
  argTypes: {
    appearance: { control: 'inline-radio', options: ['field', 'badge'] },
  },
  decorators: [
    (Story) => (
      <div className="w-70">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const isOpen = (listbox: HTMLElement) => listbox.matches(':popover-open')

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    const listbox = canvas.getByRole('listbox', { hidden: true })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveAttribute('aria-controls', listbox.id)
    await expect(trigger).toHaveTextContent('Choose a status')
    await expect(trigger.getBoundingClientRect().height).toBe(48)

    await userEvent.click(trigger)
    await expect(isOpen(listbox)).toBe(true)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(listbox).toHaveAccessibleName('Status')
    // 4px below the trigger, the same width
    const triggerBox = trigger.getBoundingClientRect()
    const menuBox = listbox.getBoundingClientRect()
    await expect(listbox).toHaveAttribute('data-placement', 'bottom')
    await expect(Math.round(menuBox.width)).toBe(Math.round(triggerBox.width))
    await waitFor(() => expect(Math.round(listbox.getBoundingClientRect().top)).toBe(Math.round(triggerBox.bottom + 4)))

    await userEvent.click(within(listbox).getByRole('option', { name: 'Offer' }))
    await expect(args.onChange).toHaveBeenCalledOnce()
    await expect(args.onChange).toHaveBeenCalledWith('offer')
    await expect(isOpen(listbox)).toBe(false)
    await expect(trigger).toHaveTextContent('Offer')
    await expect(trigger).toHaveFocus()
    // The menu stays rendered for the 120ms exit, then hides
    await waitFor(() => expect(listbox).not.toBeVisible())

    // The selected option is semibold with a check, and aria-selected
    await userEvent.click(trigger)
    const offer = within(listbox).getByRole('option', { name: 'Offer' })
    await expect(offer).toHaveAttribute('aria-selected', 'true')
    await expect(offer.querySelector('svg')).not.toBeNull()
    await expect(trigger).toHaveAttribute('aria-activedescendant', offer.id)
    // Pressing the trigger again closes it without a change
    await userEvent.click(trigger)
    await expect(isOpen(listbox)).toBe(false)
    await expect(args.onChange).toHaveBeenCalledOnce()
  },
}

export const Keyboard: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox')
    const listbox = canvas.getByRole('listbox', { hidden: true })
    const option = (name: string) => within(listbox).getByRole('option', { name, hidden: true })
    const expectActive = (name: string) =>
      expect(trigger).toHaveAttribute('aria-activedescendant', option(name).id)

    await userEvent.tab()
    await expect(trigger).toHaveFocus()

    // Enter opens at the first option; ↓ and ↑ move without wrapping
    await userEvent.keyboard('{Enter}')
    await expect(isOpen(listbox)).toBe(true)
    await expectActive('Applied')
    await userEvent.keyboard('{ArrowUp}')
    await expectActive('Applied')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await expectActive('Offer')
    // End skips the disabled Role Eliminated; Home jumps back
    await userEvent.keyboard('{End}')
    await expectActive('Unlikely')
    await userEvent.keyboard('{ArrowDown}')
    await expectActive('Unlikely')
    await userEvent.keyboard('{Home}')
    await expectActive('Applied')

    // Enter selects, closes, and focus stays on the trigger
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(args.onChange).toHaveBeenLastCalledWith('interviewing')
    await expect(isOpen(listbox)).toBe(false)
    await expect(trigger).toHaveFocus()
    await expect(trigger).not.toHaveAttribute('aria-activedescendant')

    // Space reopens at the selected option; Esc closes without a change
    await userEvent.keyboard(' ')
    await expect(isOpen(listbox)).toBe(true)
    await expectActive('Interviewing')
    await userEvent.keyboard('{ArrowDown}{Escape}')
    await expect(isOpen(listbox)).toBe(false)
    await expect(args.onChange).toHaveBeenCalledOnce()

    // ↑ opens at the last option; Space selects
    await userEvent.keyboard('{ArrowUp}')
    await expectActive('Unlikely')
    await userEvent.keyboard(' ')
    await expect(args.onChange).toHaveBeenLastCalledWith('unlikely')

    // Tab selects the highlighted option and moves on
    await userEvent.keyboard('{ArrowDown}{ArrowUp}')
    await expectActive('Rejected')
    await userEvent.tab()
    await expect(args.onChange).toHaveBeenLastCalledWith('rejected')
    await expect(isOpen(listbox)).toBe(false)
    await expect(trigger).not.toHaveFocus()
    await expect(args.onBlur).toHaveBeenCalled()
  },
}

export const Typeahead: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox')
    const listbox = canvas.getByRole('listbox', { hidden: true })
    const option = (name: string) => within(listbox).getByRole('option', { name, hidden: true })
    trigger.focus()

    // Typing on the closed trigger opens at the match
    await userEvent.keyboard('o')
    await expect(isOpen(listbox)).toBe(true)
    await expect(trigger).toHaveAttribute('aria-activedescendant', option('Offer').id)

    // Typing a longer prefix narrows the match without selecting
    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 600))
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('un')
    await expect(trigger).toHaveAttribute('aria-activedescendant', option('Unlikely').id)
    // Disabled options are never a match: "r" finds Rejected, and "ro" skips Role Eliminated
    await new Promise((resolve) => setTimeout(resolve, 600))
    await userEvent.keyboard('ro')
    await expect(trigger).toHaveAttribute('aria-activedescendant', option('Rejected').id)
    await expect(args.onChange).not.toHaveBeenCalled()
  },
}

export const Pointer: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox')
    const listbox = canvas.getByRole('listbox', { hidden: true })
    await userEvent.click(trigger)
    // The highlight follows the pointer
    const rejected = within(listbox).getByRole('option', { name: 'Rejected' })
    await userEvent.hover(rejected)
    await expect(trigger).toHaveAttribute('aria-activedescendant', rejected.id)
    // Disabled options can't be highlighted or chosen
    const eliminated = within(listbox).getByRole('option', { name: 'Role Eliminated' })
    await expect(eliminated).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(eliminated, { pointerEventsCheck: 0 })
    await expect(isOpen(listbox)).toBe(true)
    await expect(args.onChange).not.toHaveBeenCalled()
    // A press outside closes it
    await userEvent.click(document.body)
    await expect(isOpen(listbox)).toBe(false)
  },
}

export const InFormField: Story = {
  args: { 'aria-label': undefined, defaultValue: 'interviewing' },
  render: (args) => (
    <FormField label="Status" hint="Changes are saved right away.">
      <Select {...args} />
    </FormField>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await expect(trigger).toHaveAccessibleDescription('Changes are saved right away.')
    await expect(trigger).toHaveTextContent('Interviewing')
    // The label focuses the trigger
    await userEvent.click(canvas.getByText('Status'))
    await expect(trigger).toHaveFocus()
    // The listbox is named by the same label
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('listbox')).toHaveAccessibleName('Status')
  },
}

export const Error: Story = {
  render: (args) => (
    <FormField label="Status" error="Choose a status">
      <Select {...args} aria-label={undefined} />
    </FormField>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await expect(trigger).toBeInvalid()
    await expect(trigger).toHaveAccessibleDescription('Choose a status')
    // Error wins over focus: the border keeps its color
    const errorColor = getComputedStyle(trigger).borderColor
    trigger.focus()
    await new Promise((resolve) => setTimeout(resolve, 200))
    await expect(getComputedStyle(trigger).borderColor).toBe(errorColor)
  },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'interviewing' },
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox')
    await expect(trigger).toBeDisabled()
    await userEvent.click(trigger, { pointerEventsCheck: 0 })
    await expect(isOpen(canvas.getByRole('listbox', { hidden: true }))).toBe(false)
    await expect(args.onChange).not.toHaveBeenCalled()
  },
}

/** While a change saves: looks disabled and ignores input, but keeps focus */
export const Busy: Story = {
  args: { busy: true, defaultValue: 'offer' },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    await expect(trigger).toHaveAttribute('aria-busy', 'true')
    await expect(trigger).toHaveAttribute('aria-disabled', 'true')
    await expect(trigger).toBeEnabled()
    await userEvent.click(trigger)
    await expect(trigger).toHaveFocus()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard('{ArrowDown}')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  },
}

export const NativeForm: Story = {
  args: { name: 'status', defaultValue: 'applied' },
  render: (args) => (
    <form aria-label="Application" onSubmit={(event) => event.preventDefault()}>
      <Select {...args} />
    </form>
  ),
  play: async ({ canvas }) => {
    const form = canvas.getByRole('form')
    await expect(new FormData(form as HTMLFormElement).get('status')).toBe('applied')
    await userEvent.click(canvas.getByRole('combobox'))
    await userEvent.click(canvas.getByRole('option', { name: 'Offer' }))
    await expect(new FormData(form as HTMLFormElement).get('status')).toBe('offer')
  },
}

export const FlipsAbove: Story = {
  decorators: [
    (Story) => (
      <div className="flex h-[calc(100vh-2rem)] w-70 items-end">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox')
    const listbox = canvas.getByRole('listbox', { hidden: true })
    await userEvent.click(trigger)
    await expect(listbox).toHaveAttribute('data-placement', 'top')
    await waitFor(() =>
      expect(Math.round(listbox.getBoundingClientRect().bottom)).toBe(
        Math.round(trigger.getBoundingClientRect().top - 4),
      ),
    )
  },
}

export const WithSwatches: Story = {
  args: { options: statusBadges, defaultValue: 'interviewing' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
  },
}

export const Badge: Story = {
  args: { appearance: 'badge', options: statusBadges, defaultValue: 'interviewing' },
  render: (args) => (
    // A clickable row around it, like ApplicationCard
    <div
      data-testid="row"
      onClick={(event) => (event.currentTarget.dataset.clicked = 'true')}
      className="py-4"
    >
      <Select {...args} />
    </div>
  ),
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Status' })
    const listbox = canvas.getByRole('listbox', { hidden: true })
    await expect(trigger).toHaveTextContent('Interviewing')
    // 32px to see, 44px to hit
    await expect(trigger.getBoundingClientRect().height).toBe(32)
    await expect(getComputedStyle(trigger, '::before').height).toBe('44px')

    await userEvent.click(trigger)
    await expect(isOpen(listbox)).toBe(true)
    // Min width 200, wider than the badge
    await expect(Math.round(listbox.getBoundingClientRect().width)).toBe(200)
    await userEvent.click(within(listbox).getByRole('option', { name: 'Rejected' }))
    await expect(args.onChange).toHaveBeenCalledOnce()
    await expect(args.onChange).toHaveBeenCalledWith('rejected')
    await expect(trigger).toHaveTextContent('Rejected')
    // Neither the trigger nor the menu opens the row
    await expect(canvas.getByTestId('row')).not.toHaveAttribute('data-clicked')
  },
}

// Placeholder and filled, as in the Figma component set (focus and open are shown by play functions)
export const States: Story = {
  decorators: [
    (Story) => (
      <div className="w-[36rem]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <div className="grid grid-cols-2 gap-4">
      <Select {...args} aria-label="Default" />
      <Select {...args} aria-label="Default filled" defaultValue="interviewing" />
      <Select {...args} aria-label="Focus" />
      <Select {...args} aria-label="Focus filled" defaultValue="interviewing" />
      <Select {...args} aria-label="Error" aria-invalid />
      <Select {...args} aria-label="Error filled" defaultValue="interviewing" aria-invalid />
      <Select {...args} aria-label="Disabled" disabled />
      <Select {...args} aria-label="Disabled filled" defaultValue="interviewing" disabled />
      <Select {...args} aria-label="Badge" appearance="badge" options={statusBadges} defaultValue="interviewing" />
      <Select {...args} aria-label="Badge disabled" appearance="badge" options={statusBadges} defaultValue="interviewing" disabled />
    </div>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('combobox', { name: 'Focus filled' }).focus()
  },
}

// The menu open over the field, like the Figma "open Status field" examples
export const Open: Story = {
  args: { defaultValue: 'interviewing' },
  decorators: [
    (Story) => (
      <div className="h-80">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox')
    await userEvent.click(trigger)
    await userEvent.hover(canvas.getByRole('option', { name: 'Offer' }))
  },
}

export const OpenDark: Story = {
  ...Open,
  globals: { theme: 'dark' },
}

export const Dark: Story = {
  ...States,
  globals: { theme: 'dark' },
}
