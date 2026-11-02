import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { MobileTopBar } from './MobileTopBar'

const meta = {
  title: 'Components/MobileTopBar',
  component: MobileTopBar,
  tags: ['autodocs'],
  // 390px wide, as in Figma
  decorators: [
    (Story) => (
      <div className="w-97.5 max-w-full bg-bg-canvas">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileTopBar>

export default meta
type Story = StoryObj<typeof meta>

/** The brand in a banner landmark: 49px tall, as in Figma */
export const Default: Story = {
  play: async ({ canvas }) => {
    const banner = canvas.getByRole('banner')
    await expect(banner).toHaveTextContent('Job Tracker')
    await expect(banner.getBoundingClientRect().height).toBe(49)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}
