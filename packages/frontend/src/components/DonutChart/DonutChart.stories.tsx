import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { DonutChart } from './DonutChart'

// The Figma example: 42 applications by status
const statuses = [
  { label: 'Applied', value: 22 },
  { label: 'Interviewing', value: 8 },
  { label: 'Offer', value: 2 },
  { label: 'Rejected', value: 6 },
  { label: 'Unlikely', value: 4 },
]

const meta = {
  title: 'Components/Data display/DonutChart',
  component: DonutChart,
  tags: ['autodocs'],
  args: {
    data: statuses,
    label: 'Applications by status',
    totalLabel: 'applications',
  },
  decorators: [
    (Story) => (
      <div className="w-130 rounded-sm bg-bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DonutChart>

export default meta
type Story = StoryObj<typeof meta>

const segments = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll<SVGCircleElement>('[data-segment]'))

/** A segment per category, the total in the center and a legend of real text */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('group', { name: 'Applications by status' })).toBeInTheDocument()
    await expect(segments(canvasElement)).toHaveLength(5)
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    const legend = canvas.getAllByRole('listitem')
    await expect(legend).toHaveLength(5)
    await expect(legend[0]).toHaveTextContent('Applied22')
    await expect(legend[4]).toHaveTextContent('Unlikely4')

    // Screen readers get the final total; the visible one counts up to it
    await expect(canvas.getByText('42 applications')).toHaveClass('sr-only')
    await waitFor(() => expect(canvas.getByText('42', { selector: '[aria-hidden]' })).toBeInTheDocument())

    // Applied is 22/42 of the ring, less the 1.7° gap, starting at 12 o'clock
    const [applied, interviewing] = segments(canvasElement)
    const appliedSweep = (22 / 42) * 360
    await expect(parseFloat(applied.getAttribute('stroke-dasharray') ?? '')).toBeCloseTo(appliedSweep - 1.7)
    await expect(parseFloat(interviewing.getAttribute('stroke-dashoffset') ?? '')).toBeCloseTo(-appliedSweep)
  },
}

/** A zero keeps its legend row but draws no segment */
export const ZeroCategory: Story = {
  args: {
    data: [
      { label: 'Applied', value: 12 },
      { label: 'Interviewing', value: 3 },
      { label: 'Offer', value: 0 },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(segments(canvasElement)).toHaveLength(2)
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3)
    await expect(canvas.getByText('15 applications')).toBeInTheDocument()
  },
}

/** `total` overrides the sum, e.g. when a category is left out of the ring */
export const CustomTotal: Story = {
  args: { total: 50 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('50 applications')).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(segments(canvasElement)).toHaveLength(5)
  },
}
