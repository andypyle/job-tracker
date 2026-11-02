import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { Avatar } from './Avatar'
import type { AvatarSize } from './Avatar.types'

// A stand-in logo, like the Figma image fill. Inline, so story tests don't touch the network.
const logo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g"><stop offset="0" stop-color="#c2d1cc"/><stop offset="1" stop-color="#8fa39e"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/></svg>',
)}`
const broken = '/missing-logo.png'

const sizes: AvatarSize[] = ['sm', 'md', 'lg']

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: {
    initials: 'AC',
    size: 'md',
  },
  argTypes: {
    size: { control: 'inline-radio', options: sizes },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('AC')).toBeInTheDocument()
  },
}

export const WithImage: Story = {
  args: { src: logo, alt: 'Acme Corp logo' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Acme Corp logo' })).toHaveAttribute('src', logo)
  },
}

export const NoInitials: Story = {
  args: { initials: undefined },
}

/** The Figma grid: initials, image and icon at sm, md and lg */
export const AllVariants: Story = {
  render: () => (
    // As in Figma: 56px columns 24px apart, rows 16px apart, each avatar at its cell's top left
    <div className="grid grid-cols-[repeat(3,--spacing(14))] gap-x-6 gap-y-4">
      {sizes.map((size) => (
        <div key={size} className="contents">
          <Avatar size={size} initials="AC" />
          <Avatar size={size} src={logo} />
          <Avatar size={size} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Computed sizes, not getBoundingClientRect: the Storybook zoom tool scales the rect
    const avatars = canvasElement.querySelectorAll('[data-content]')
    const sizes = Array.from(avatars, (el) => {
      const { width, height } = getComputedStyle(el)
      return `${width}×${height}`
    })
    await expect(sizes).toEqual(
      ['32px', '32px', '32px', '40px', '40px', '40px', '56px', '56px', '56px'].map((s) => `${s}×${s}`),
    )
  },
}

/** A broken image falls back to the initials, and with no initials to the icon. The name stays. */
export const Fallbacks: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar src={broken} initials="AC" alt="Acme Corp" />
      <Avatar src={broken} alt="Globex" />
      <Avatar src={null} initials="" alt="Initech" />
    </div>
  ),
  play: async ({ canvas }) => {
    // Before the error, the name is on the <img>; after it, on the wrapper. Query each time.
    await waitFor(() =>
      expect(canvas.getByRole('img', { name: 'Acme Corp' })).toHaveAttribute('data-content', 'initials'),
    )
    await expect(canvas.getByRole('img', { name: 'Acme Corp' })).toHaveTextContent('AC')
    await waitFor(() =>
      expect(canvas.getByRole('img', { name: 'Globex' })).toHaveAttribute('data-content', 'icon'),
    )
    await expect(canvas.getByRole('img', { name: 'Initech' })).toHaveAttribute('data-content', 'icon')
    await expect(canvas.queryByRole('img', { name: '' })).not.toBeInTheDocument()
  },
}

/** Next to a visible name, leave out alt: the avatar is hidden from assistive tech */
export const Decorative: Story = {
  render: () => (
    <div className="flex items-center gap-3 text-label-base text-text-primary">
      <Avatar initials="AC" />
      Acme Corp
    </div>
  ),
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument()
    await expect(canvasElement.querySelector('[data-content]')).toHaveAttribute('aria-hidden', 'true')
  },
}

export const Dark: Story = {
  ...AllVariants,
  globals: { theme: 'dark' },
}
