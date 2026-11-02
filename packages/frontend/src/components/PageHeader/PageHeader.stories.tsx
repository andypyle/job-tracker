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
    const arrow = back.querySelector('svg') as SVGElement
    await expect(Math.round(arrow.getBoundingClientRect().left)).toBe(Math.round(title.getBoundingClientRect().left))
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
