import { useState, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Avatar } from '../Avatar/Avatar'
import { Badge } from '../Badge/Badge'
import { Button } from '../Button/Button'
import { ListItem, ListItemText, ListItemTitle } from './ListItem'

// Stands in for a router Link. Stories don't navigate; the spy records the click.
const onNavigate = fn()
const JobLink = ({ children, current }: { children: ReactNode; current?: boolean }) => (
  <a
    href="#job-1"
    aria-current={current ? 'true' : undefined}
    onClick={(event) => {
      event.preventDefault()
      onNavigate()
    }}
  >
    {children}
  </a>
)

// The Figma row: Avatar, three lines of text, trailing content
const content = (
  title: ReactNode = 'Senior Product Designer',
  trailing: ReactNode = <Badge tone="info" appearance="soft">Interviewing</Badge>,
) => (
  <>
    <Avatar size="md" initials="NL" />
    <ListItemText>
      <ListItemTitle>{title}</ListItemTitle>
      <p>Northwind Labs</p>
      <p className="text-caption-regular">$165k–$190k · Oct 2, 2026</p>
    </ListItemText>
    {trailing}
  </>
)

const meta = {
  title: 'Components/Data display/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  args: { children: content() },
  argTypes: { children: { control: false } },
  // 720px wide, as in Figma
  decorators: [
    (Story) => (
      <ul className="flex w-180 flex-col gap-4">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof ListItem>

export default meta
type Story = StoryObj<typeof meta>

const row = (canvasElement: HTMLElement) => canvasElement.querySelector('li') as HTMLLIElement

// What a real pointer hits at an element's center. userEvent.click(el) skips hit testing.
const hitAt = (el: Element) => {
  const { x, y, width, height } = el.getBoundingClientRect()
  return document.elementFromPoint(x + width / 2, y + height / 2) as Element
}

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Senior Product Designer')).toBeVisible()
    await expect(getComputedStyle(row(canvasElement)).height).toBe('80px')
    // Title/Base, then Body/Small and the caption line from ListItemText's defaults
    await expect(getComputedStyle(canvas.getByText('Senior Product Designer')).fontWeight).toBe('600')
    await expect(getComputedStyle(canvas.getByText('Northwind Labs')).fontSize).toBe('14px')
    await expect(getComputedStyle(canvas.getByText('$165k–$190k · Oct 2, 2026')).fontSize).toBe('12px')
  },
}

export const TitleOnly: Story = {
  args: {
    children: (
      <ListItemText>
        <ListItemTitle>Senior Product Designer</ListItemTitle>
      </ListItemText>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(row(canvasElement)).height).toBe('80px')
  },
}

/** A link in the title covers the row; a button in the trailing content stays clickable */
export const AsLink: Story = {
  args: {
    children: content(
      <JobLink>Senior Product Designer</JobLink>,
      <Button variant="secondary" onClick={fn()}>Edit</Button>,
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    onNavigate.mockClear()
    const link = canvas.getByRole('link', { name: 'Senior Product Designer' })

    // Keyboard focus rings the whole row through the link's ::after
    await userEvent.tab()
    await expect(link).toHaveFocus()
    const after = getComputedStyle(link, '::after')
    await expect(after.position).toBe('absolute')
    await expect(after.outlineStyle).toBe('solid')
    await expect(after.width).toBe(getComputedStyle(row(canvasElement)).width)

    // A press on the subtitle or the avatar lands on the link
    await userEvent.click(hitAt(canvas.getByText('Northwind Labs')))
    await userEvent.click(hitAt(canvas.getByText('NL')))
    await expect(onNavigate).toHaveBeenCalledTimes(2)

    // The button sits above the link
    const edit = canvas.getByRole('button', { name: 'Edit' })
    await expect(edit.contains(hitAt(edit))).toBe(true)
    await userEvent.click(hitAt(edit))
    await expect(onNavigate).toHaveBeenCalledTimes(2)

    // Hover draws the 1px border/strong ring (CSS :hover needs a real pointer, so check the rule)
    await expect(row(canvasElement)).toHaveClass('has-[[data-list-item-title]_a]:hover:inset-ring-1')
  },
}

export const Selected: Story = {
  args: { selected: true, children: content(<JobLink current>Senior Product Designer</JobLink>) },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('link')).toHaveAttribute('aria-current', 'true')
    // The 3px rail takes 3px of the 20px padding, so the content stays put
    const style = getComputedStyle(row(canvasElement))
    await expect(style.borderLeftWidth).toBe('3px')
    await expect(style.paddingLeft).toBe('17px')
  },
}

/** Rows added after the list rendered rise into place */
export const Enter: Story = {
  render: function Render() {
    const [count, setCount] = useState(1)
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <ListItem key={i} enter={i > 0}>
            {content(`Role ${i + 1}`)}
          </ListItem>
        ))}
        <li className="list-none">
          <Button onClick={() => setCount((n) => n + 1)}>Add row</Button>
        </li>
      </>
    )
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(getComputedStyle(row(canvasElement)).animationName).toBe('none')
    await userEvent.click(canvas.getByRole('button', { name: 'Add row' }))
    const added = canvas.getByText('Role 2').closest('li') as HTMLLIElement
    await expect(getComputedStyle(added).animationName).toBe('rise-in')
  },
}

/** The Figma grid: default, hover (pinned with its ring) and selected */
export const AllStates: Story = {
  render: () => (
    <>
      <ListItem>{content()}</ListItem>
      <ListItem className="inset-ring-1 inset-ring-border-strong">{content()}</ListItem>
      <ListItem selected>{content()}</ListItem>
    </>
  ),
  play: async ({ canvasElement }) => {
    const heights = Array.from(canvasElement.querySelectorAll('li'), (el) => getComputedStyle(el).height)
    await expect(heights).toEqual(['80px', '80px', '80px'])
  },
}

export const AllStatesDark: Story = {
  ...AllStates,
  globals: { theme: 'dark' },
}
