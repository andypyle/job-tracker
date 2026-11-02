import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../Button/Button'
import { PageHeader } from './PageHeader'

const onAdd = fn()

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Active applications',
    description: '14 in progress · 2 interviewing',
    actions: (
      <>
        <Button variant="secondary">Export</Button>
        <Button icon="plus" onClick={onAdd}>
          Add application
        </Button>
      </>
    ),
  },
  argTypes: {
    appearance: { control: 'inline-radio', options: ['band', 'plain'] },
    actions: { control: false },
  },
  parameters: { layout: 'fullscreen' },
  // 1200px on the canvas, as in Figma
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-300 bg-bg-canvas pb-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

/** Band: bg/header with a hairline, 134px as in Figma */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const header = canvasElement.querySelector('header') as HTMLElement
    await expect(getComputedStyle(header).height).toBe('134px')
    await expect(getComputedStyle(header).borderBottomWidth).toBe('1px')

    const title = canvas.getByRole('heading', { level: 1, name: 'Active applications' })
    await expect(getComputedStyle(title).fontSize).toBe('36px')

    await userEvent.click(canvas.getByRole('button', { name: 'Add application' }))
    await expect(onAdd).toHaveBeenCalled()
  },
}

/** Plain: no fill, for nested views. 110px. */
export const Plain: Story = {
  args: { appearance: 'plain' },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('header') as HTMLElement
    await expect(getComputedStyle(header).height).toBe('110px')
    await expect(getComputedStyle(header).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  },
}

/**
 * Where the 20px arrow glyph starts. Once its animation loads, the icon is a 4/3-size frame with
 * the glyph inset by a sixth of 20px (AnimatedIcon), so measure from the middle.
 */
const glyphLeft = (link: HTMLElement) => {
  const box = (link.firstElementChild as Element).getBoundingClientRect()
  return box.left + (box.width - 20) / 2
}

/** A detail page: the back link above the title, lined up with it */
export const WithBackLink: Story = {
  args: {
    title: 'Senior Product Designer',
    description: 'Northwind Labs · Applied Oct 2, 2026',
    back: { to: '/jobs', label: 'Back to jobs' },
    actions: <Button variant="secondary">Edit</Button>,
  },
  play: async ({ canvas }) => {
    const back = canvas.getByRole('link', { name: 'Back to jobs' })
    await expect(back).toHaveAttribute('href', '/jobs')
    const title = canvas.getByRole('heading', { level: 1 })
    // The arrow lines up with the title's left edge
    await expect(Math.round(glyphLeft(back))).toBe(Math.round(title.getBoundingClientRect().left))
  },
}

/**
 * Below md the back link's fill stops 8px short of the screen edge, and its text sits 24px under
 * the top, as far as the title is below it
 */
export const WithBackLinkPhone: Story = {
  ...WithBackLink,
  globals: { viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement }) => {
    const back = canvas.getByRole('link', { name: 'Back to jobs' })
    const title = canvas.getByRole('heading', { level: 1 })
    await expect(Math.round(glyphLeft(back))).toBe(Math.round(title.getBoundingClientRect().left))
    const header = canvasElement.querySelector('header') as HTMLElement
    await expect(back.getBoundingClientRect().left - header.getBoundingClientRect().left).toBe(8)
    await expect(getComputedStyle(header).paddingTop).toBe('12px')
  },
}

/** Without actions or a description, only the title */
export const TitleOnly: Story = {
  args: { description: undefined, actions: undefined },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
    await expect(getComputedStyle(canvasElement.querySelector('header') as HTMLElement).height).toBe('104px')
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  args: { back: { to: '/jobs', label: 'Back to jobs' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument()
  },
}
