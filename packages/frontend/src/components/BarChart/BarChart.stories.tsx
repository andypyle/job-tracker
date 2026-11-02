import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { cn } from '../../lib/cn'
import { BarChart } from './BarChart'

// The Figma example: applications per week, 3 to 8 (54px to 144px tall)
const weeks = [
  { label: 'Sep 1', value: 3 },
  { label: 'Sep 8', value: 5 },
  { label: 'Sep 15', value: 2 },
  { label: 'Sep 22', value: 6 },
  { label: 'Sep 29', value: 4 },
  { label: 'Oct 6', value: 8 },
  { label: 'Oct 13', value: 5 },
  { label: 'Oct 20', value: 7 },
]

const meta = {
  title: 'Components/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  args: {
    data: weeks,
    label: '40 applications over 8 weeks, peak 8 on Oct 6',
  },
  // On a surface, 472px wide as in Figma; Narrow uses 280px
  decorators: [
    (Story, { parameters }) => (
      <div className={cn('rounded-sm bg-bg-surface p-6', parameters.narrow ? 'w-82' : 'w-130')}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BarChart>

export default meta
type Story = StoryObj<typeof meta>

const bars = (canvasElement: HTMLElement) => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-bar]'))

/** Bars scale to the tallest, which fills 90% of the 160px plot */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('group', { name: /40 applications over 8 weeks/ })).toBeInTheDocument()
    await expect(canvas.getByRole('img', { name: 'Oct 6: 8' })).toBeInTheDocument()

    const heights = bars(canvasElement).map((bar) => getComputedStyle(bar).height)
    await expect(heights).toEqual(['54px', '90px', '36px', '108px', '72px', '144px', '90px', '126px'])
    await expect(getComputedStyle(bars(canvasElement)[0]).width).toBe('28px')
    await expect(canvas.getByText('Oct 20', { selector: 'span' })).toBeVisible()
  },
}

/** One tab stop; arrow keys, Home and End move between bars, and the focused bar shows its value */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    const [first, second] = canvas.getAllByRole('img')
    await userEvent.tab()
    await expect(first).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    await expect(second).toHaveFocus()
    await expect(first).toHaveAttribute('tabindex', '-1')
    await expect(second).toHaveAttribute('tabindex', '0')

    await userEvent.keyboard('{End}')
    const last = canvas.getByRole('img', { name: 'Oct 20: 7' })
    await expect(last).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(last).toHaveFocus()

    await userEvent.keyboard('{Home}')
    await expect(first).toHaveFocus()
    // The value label above the focused bar
    const value = first.querySelector('span') as HTMLElement
    await expect(value).toHaveTextContent('3')
    await expect(value).toHaveClass('group-focus-visible/bar:opacity-100')
  },
}

/** formatValue changes the hover label and what screen readers hear */
export const FormattedValues: Story = {
  args: {
    data: [
      { label: 'Jul', value: 12 },
      { label: 'Aug', value: 18 },
      { label: 'Sep', value: 25 },
      { label: 'Oct', value: 31 },
    ],
    label: 'Response rate by month, rising from 12% to 31%',
    formatValue: (n) => `${n}%`,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Oct: 31%' })).toBeInTheDocument()
  },
}

/** Below 360px of plot width, every other x label shows */
export const Narrow: Story = {
  parameters: { narrow: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Sep 1', { selector: 'span' })).toBeVisible()
    await expect(canvas.getByText('Sep 8', { selector: 'span' })).not.toBeVisible()
    await expect(canvas.getByText('Sep 15', { selector: 'span' })).toBeVisible()
  },
}

/** All zeros draw no bars rather than dividing by zero */
export const Empty: Story = {
  args: {
    data: weeks.map((week) => ({ ...week, value: 0 })),
    label: 'No applications over 8 weeks',
  },
  play: async ({ canvasElement }) => {
    await expect(bars(canvasElement).every((bar) => getComputedStyle(bar).height === '0px')).toBe(true)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('img')).toHaveLength(8)
  },
}
