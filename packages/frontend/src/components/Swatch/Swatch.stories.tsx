import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { tones } from '../../lib/tone'
import { Swatch } from './Swatch'

const meta = {
  title: 'Components/Swatch',
  component: Swatch,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'inline-radio', options: tones },
  },
} satisfies Meta<typeof Swatch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Swatch {...args} data-testid="swatch" />,
  play: async ({ canvas }) => {
    const swatch = canvas.getByTestId('swatch')
    await expect(swatch.getBoundingClientRect().width).toBe(12)
    await expect(swatch).toHaveAttribute('aria-hidden', 'true')
  },
}

export const AllTones: Story = {
  render: () => (
    <div className="flex gap-3">
      {tones.map((tone) => (
        <Swatch key={tone} tone={tone} />
      ))}
    </div>
  ),
}

export const Dark: Story = {
  ...AllTones,
  globals: { theme: 'dark' },
}
