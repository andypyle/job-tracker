import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { cn } from '../../lib/cn'
import { DescriptionList, DescriptionListItem } from './DescriptionList'

// The Figma example: application details on a surface, 24px across and 8px down
const details = (
  <>
    <DescriptionListItem label="Job post">jobs.northwindlabs.com/designer-412</DescriptionListItem>
    <DescriptionListItem label="Industry">Technology</DescriptionListItem>
    <DescriptionListItem label="Compensation">$165k–$190k</DescriptionListItem>
    <DescriptionListItem label="Applied">October 2, 2026</DescriptionListItem>
    <DescriptionListItem label="Notes">Recruiter: Priya. Portfolio review with the design lead.</DescriptionListItem>
    <DescriptionListItem label="Location">{null}</DescriptionListItem>
  </>
)

const meta = {
  title: 'Components/DescriptionList',
  component: DescriptionList,
  tags: ['autodocs'],
  args: { children: details },
  argTypes: { children: { control: false } },
  // On a surface 640px wide, as in Figma; Stacked narrows it to Figma's 343px
  decorators: [
    (Story, { parameters }) => (
      <div className={cn('rounded-sm bg-bg-surface px-6 py-2', parameters.stacked ? 'w-86' : 'w-160')}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DescriptionList>

export default meta
type Story = StoryObj<typeof meta>

const items = (canvasElement: HTMLElement) => Array.from(canvasElement.querySelectorAll('dl > div'))

/** Inline from 32rem: a 160px label column */
export const Inline: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('term')).toHaveLength(6)
    await expect(canvas.getAllByRole('definition')).toHaveLength(6)
    const [first] = items(canvasElement)
    await expect(getComputedStyle(first).flexDirection).toBe('row')
    await expect(getComputedStyle(first).height).toBe('48px')
    await expect(getComputedStyle(canvas.getByText('Job post')).width).toBe('160px')
  },
}

/** Below 32rem the label sits above the value. The list's width decides, not the viewport's. */
export const Stacked: Story = {
  parameters: { stacked: true },
  play: async ({ canvasElement }) => {
    const [first] = items(canvasElement)
    await expect(getComputedStyle(first).flexDirection).toBe('column')
    await expect(getComputedStyle(first).height).toBe('72px')
  },
}

/** An empty value reads "Not set" in text/muted, never a blank cell */
export const NotSet: Story = {
  args: {
    children: (
      <>
        <DescriptionListItem label="Location">{null}</DescriptionListItem>
        <DescriptionListItem label="Salary">{''}</DescriptionListItem>
        <DescriptionListItem label="Referral" />
        <DescriptionListItem label="Compensation">$165k–$190k</DescriptionListItem>
      </>
    ),
  },
  play: async ({ canvas }) => {
    const notSet = canvas.getAllByText('Not set')
    await expect(notSet).toHaveLength(3)
    await expect(notSet[0]).toHaveClass('text-text-muted')
    await expect(canvas.getByText('$165k–$190k')).toHaveClass('text-text-primary')
  },
}

export const InlineDark: Story = {
  ...Inline,
  globals: { theme: 'dark' },
}

export const StackedDark: Story = {
  ...Stacked,
  globals: { theme: 'dark' },
}
