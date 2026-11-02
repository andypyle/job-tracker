import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { tones } from '../../lib/tone'
import { Button } from '../Button/Button'
import { Stat } from './Stat'
import type { StatEmphasis } from './Stat.types'

const emphases: StatEmphasis[] = ['subtle', 'strong']

const meta = {
  title: 'Components/Stat',
  component: Stat,
  tags: ['autodocs'],
  args: {
    label: 'Total Applications',
    value: 42,
    sublabel: 'Applied + Interviewing',
    tone: 'neutral',
    emphasis: 'subtle',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: tones },
    emphasis: { control: 'inline-radio', options: emphases },
    format: { control: false },
  },
  // 264px wide, as in Figma
  decorators: [(Story) => <div className="w-66"><Story /></div>],
} satisfies Meta<typeof Stat>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Total Applications')).toBeVisible()
    await expect(canvas.getByText('Applied + Interviewing')).toBeVisible()
    await expect(canvas.getAllByText('42')).toHaveLength(2) // shown, and the screen reader copy
  },
}

export const Strong: Story = {
  args: { emphasis: 'strong' },
}

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvas, canvasElement }) => {
    const stat = canvasElement.querySelector('[aria-busy="true"]')
    await expect(stat).not.toBeNull()
    await expect(canvas.getByText('Total Applications: loading')).toBeInTheDocument()
    await expect(canvas.queryByText('42')).toBeNull()
  },
}

/** Any presentation of a number goes through `format` */
export const Formatted: Story = {
  args: { label: 'Response Rate', value: 35, sublabel: 'Responses received', format: (n) => `${n}%` },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('35%')).toHaveLength(2)
  },
}

/** A string shows as is, for values that aren't counts */
export const NoValue: Story = {
  args: { label: 'Avg. response time', value: '—', sublabel: undefined },
}

/** A new value counts up over duration/slow with ease/out. Reduced motion jumps to it. */
export const CountsUp: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(42)
    return (
      <div className="flex flex-col items-start gap-4">
        <Stat {...args} value={value} className="self-stretch" />
        <Button onClick={() => setValue((v) => v + 15)}>Add 15</Button>
      </div>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add 15' }))
    // Screen readers get the final value straight away; the visible one gets there
    await expect(canvasElement.querySelector('.sr-only')).toHaveTextContent('57')
    await waitFor(() => expect(canvasElement.querySelector('[aria-hidden="true"]')).toHaveTextContent('57'))
  },
}

/** The Figma grid: every tone in subtle and strong, then loading */
export const AllVariants: Story = {
  decorators: [],
  render: (args) => (
    <div className="grid grid-cols-[repeat(2,--spacing(66))] gap-6">
      {tones.map((tone) =>
        emphases.map((emphasis) => (
          <Stat key={`${tone}-${emphasis}`} {...args} tone={tone} emphasis={emphasis} />
        )),
      )}
      <Stat {...args} loading />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // The tone rule sits inside the padding, so every stat is the same 132px. Loading is 114px.
    // Computed sizes, not getBoundingClientRect: the Storybook zoom tool scales the rect.
    const heights = Array.from(canvasElement.querySelectorAll('.grid > *'), (el) => getComputedStyle(el).height)
    await expect(heights).toEqual([...Array(10).fill('132px'), '114px'])
  },
}

export const AllVariantsDark: Story = {
  ...AllVariants,
  globals: { theme: 'dark' },
}
