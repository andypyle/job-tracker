import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { tones } from '../../lib/tone'
import { Badge } from './Badge'

const appearances = ['solid', 'soft', 'outline'] as const

const meta = {
  title: 'Components/Data display/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Applied',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: tones },
    appearance: { control: 'inline-radio', options: appearances },
    size: { control: 'inline-radio', options: ['small', 'medium'] },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const badge = canvas.getByText('Applied')
    await expect(badge.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(badge).borderRadius).toBe('4px')
  },
}

export const Medium: Story = {
  args: { size: 'medium', tone: 'warning', children: 'Interviewing' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Interviewing').getBoundingClientRect().height).toBe(32)
  },
}

export const WithIcons: Story = {
  args: { tone: 'neutral', appearance: 'outline', leadingIcon: 'star', children: 'Referral' },
  play: async ({ canvas }) => {
    // Icons are decorative; the label carries the meaning
    const badge = canvas.getByText('Referral')
    await expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await expect(badge.querySelector('svg')).toHaveAttribute('width', '12')
  },
}

// Every tone, appearance and size, as in the Figma component set
export const AllVariants: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(3,max-content)] items-center justify-items-start gap-x-8 gap-y-3">
      {tones.flatMap((tone) =>
        (['small', 'medium'] as const).flatMap((size) =>
          appearances.map((appearance) => (
            <Badge key={`${tone}-${size}-${appearance}`} {...args} tone={tone} size={size} appearance={appearance} />
          )),
        ),
      )}
    </div>
  ),
}

export const Dark: Story = {
  ...AllVariants,
  globals: { theme: 'dark' },
}
