import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Icon } from './Icon'
import { iconPaths, type IconName } from './Icon.paths'

const names = Object.keys(iconPaths) as IconName[]

const meta = {
  title: 'Components/Icons/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: {
    name: 'briefcase',
    className: 'text-text-muted',
  },
  argTypes: {
    name: { control: 'select', options: names },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')
    await expect(svg).toHaveAttribute('aria-hidden', 'true')
    await expect(svg).toHaveAttribute('width', '24')
  },
}

export const Labeled: Story = {
  args: { name: 'alert-circle', label: 'Error' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Error' })).toBeInTheDocument()
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4 text-text-muted">
      <Icon {...args} size={16} />
      <Icon {...args} size={20} />
      <Icon {...args} size={24} />
    </div>
  ),
}

export const Gallery: Story = {
  render: () => (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4">
      {names.map((name) => (
        <li key={name} className="flex flex-col items-center gap-2 text-text-muted">
          <Icon name={name} />
          <span className="text-caption-regular text-text-primary">{name}</span>
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('svg')).toHaveLength(names.length)
  },
}

export const GalleryDark: Story = {
  ...Gallery,
  globals: { theme: 'dark' },
}
