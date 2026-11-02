import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../Button/Button'
import { EmptyState } from './EmptyState'

const onAdd = fn()

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No applications yet',
    description: 'Track your job search from one place. Add your first application to get started.',
    action: (
      <Button icon="plus" onClick={onAdd}>
        Add your first application
      </Button>
    ),
  },
  argTypes: { action: { control: false } },
  // 560px wide, as in Figma
  decorators: [
    (Story) => (
      <div className="w-140 max-w-full bg-bg-canvas">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** The dashboard before the first application: 336px tall, as in Figma */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const title = canvas.getByRole('heading', { level: 2, name: 'No applications yet' })
    await expect(title).toHaveClass('text-heading-h2')

    const description = canvas.getByText(/Track your job search/)
    await expect(getComputedStyle(description).maxWidth).toBe('320px')
    await expect(getComputedStyle(description).height).toBe('48px')

    await expect(getComputedStyle(canvasElement.querySelector('div > div') as HTMLElement).height).toBe('336px')

    await userEvent.click(canvas.getByRole('button', { name: 'Add your first application' }))
    await expect(onAdd).toHaveBeenCalled()
  },
}

/** Under a page heading, the title can be an h3 and still look the same */
export const TitleLevel: Story = {
  args: { titleAs: 'h3' },
  play: async ({ canvas }) => {
    const title = canvas.getByRole('heading', { level: 3 })
    await expect(title).toHaveClass('text-heading-h2')
  },
}

/** Without an action, for places where there is nothing to do yet */
export const NoAction: Story = {
  args: {
    title: 'No interviews yet',
    description: 'Applications you move to Interviewing will show up here.',
    action: undefined,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'No applications yet' })).toBeInTheDocument()
  },
}
