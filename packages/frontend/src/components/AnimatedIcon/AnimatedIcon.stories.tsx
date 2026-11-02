import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Icon } from '../Icon/Icon'
import { AnimatedIcon } from './AnimatedIcon'
import { iconAnimations } from './AnimatedIcon.animations'
import type { IconName } from '../Icon/Icon.paths'

const animated = Object.keys(iconAnimations) as IconName[]

const meta = {
  title: 'Components/Icons/AnimatedIcon',
  component: AnimatedIcon,
  tags: ['autodocs'],
  args: {
    name: 'arrow-left',
    size: 20,
    render: (handlers, icon) => (
      <button type="button" className="inline-flex items-center gap-2 p-2 text-label-base" {...handlers}>
        {icon}
        Back
      </button>
    ),
  },
  argTypes: {
    name: { control: 'select', options: animated },
  },
} satisfies Meta<typeof AnimatedIcon>

export default meta
type Story = StoryObj<typeof meta>

const waitForAnimation = (root: HTMLElement, count = 1) =>
  waitFor(() => expect(root.querySelectorAll('[data-useanimations]')).toHaveLength(count))

/** On a button, where animated icons belong */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitForAnimation(canvasElement)
    await userEvent.hover(canvas.getByRole('button', { name: 'Back' }))
  },
}

export const StaticWhenNotAnimated: Story = {
  args: { name: 'plus' },
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    await expect(canvasElement.querySelector('[data-useanimations]')).toBeNull()
    await expect(canvasElement.querySelector('svg path')).not.toBeNull()
  },
}

// Each animated icon over its static Figma glyph (static in coral). Any coral showing means a mismatch.
export const MatchesStaticIcons: Story = {
  render: () => (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4">
      {animated.map((name) => (
        <li key={name} className="flex flex-col items-center gap-2">
          <span className="relative inline-flex">
            <Icon name={name} size={20} className="absolute inset-0 text-accent-coral" />
            <AnimatedIcon
              name={name}
              size={20}
              render={(handlers, icon) => (
                <span className="relative inline-flex text-text-primary" {...handlers}>
                  {icon}
                </span>
              )}
            />
          </span>
          <span className="text-caption-regular">{name}</span>
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    await waitForAnimation(canvasElement, animated.length)
    for (const animatedSpan of canvasElement.querySelectorAll('[data-useanimations]')) {
      const staticBox = animatedSpan.parentElement!.parentElement!.querySelector('svg[aria-hidden]')!
      const a = animatedSpan.getBoundingClientRect()
      const s = staticBox.getBoundingClientRect()
      // The animated frame is 4/3 the size, centered on the static glyph
      await expect(Math.abs(a.left + a.width / 2 - (s.left + s.width / 2))).toBeLessThan(0.5)
      await expect(Math.abs(a.top + a.height / 2 - (s.top + s.height / 2))).toBeLessThan(0.5)
    }
  },
}

function MenuToggle() {
  const [open, setOpen] = useState(false)
  return (
    <AnimatedIcon<HTMLButtonElement>
      name="menu"
      active={open}
      onClick={() => setOpen(!open)}
      render={(handlers, icon) => (
        <button type="button" aria-label="Menu" aria-expanded={open} className="p-2" {...handlers}>
          {icon}
        </button>
      )}
    />
  )
}

export const Toggle: Story = {
  render: () => <MenuToggle />,
  play: async ({ canvas, canvasElement }) => {
    await waitForAnimation(canvasElement)
    const button = canvas.getByRole('button', { name: 'Menu' })
    await userEvent.click(button)
    await expect(button).toHaveAttribute('aria-expanded', 'true')
  },
}
