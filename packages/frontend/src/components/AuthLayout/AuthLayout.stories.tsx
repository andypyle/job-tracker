import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AuthLayout } from './AuthLayout'

const meta = {
  title: 'Components/AuthLayout',
  component: AuthLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-heading-h2 text-text-primary lg:text-heading-h1">Sign in</h1>
        <p className="text-body-base text-text-muted">The form goes here.</p>
      </div>
    ),
  },
} satisfies Meta<typeof AuthLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('banner')).toHaveTextContent('Know where every application stands.')
    await expect(canvas.getByRole('main')).toContainElement(canvas.getByRole('heading', { level: 1, name: 'Sign in' }))
    await expect(canvas.getByText(`© ${new Date().getFullYear()} Job Tracker`)).toBeInTheDocument()
  },
}

/** The brand panel is pinned to Dark mode in both themes; the canvas follows the theme */
export const Dark: Story = {
  globals: { theme: 'dark' },
}
