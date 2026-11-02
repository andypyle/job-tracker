import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Avatar } from '../Avatar/Avatar'
import { Badge } from '../Badge/Badge'
import { Button } from '../Button/Button'
import { ListItem, ListItemText, ListItemTitle } from '../ListItem/ListItem'
import { Card, CardHeader, CardTitle } from './Card'

const body = (
  <p className="text-body-base text-text-muted">
    Twelve applications this week, up from eight. Most went out on Monday and Tuesday.
  </p>
)

const jobs = [
  { initials: 'NL', title: 'Senior Product Designer', company: 'Northwind Labs' },
  { initials: 'GX', title: 'Design Systems Lead', company: 'Globex' },
  { initials: 'IN', title: 'Staff Designer', company: 'Initech' },
]

// Edge to edge rows for the flush card, split by border/subtle like the header
const jobList = (
  <ul className="divide-y divide-border-subtle">
    {jobs.map((job) => (
      <ListItem key={job.initials}>
        <Avatar size="md" initials={job.initials} />
        <ListItemText>
          <ListItemTitle>{job.title}</ListItemTitle>
          <p>{job.company}</p>
        </ListItemText>
        <Badge tone="info" appearance="soft">Applied</Badge>
      </ListItem>
    ))}
  </ul>
)

const meta = {
  title: 'Components/Data display/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Applications per week</CardTitle>
        </CardHeader>
        {body}
      </>
    ),
  },
  argTypes: {
    padding: { control: 'inline-radio', options: ['default', 'flush'] },
    children: { control: false },
  },
  // 520px wide, as in Figma, on the canvas
  decorators: [(Story) => <div className="w-130"><Story /></div>],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    // The title names the section, so it's a region landmark
    const card = canvas.getByRole('region', { name: 'Applications per week' })
    await expect(canvas.getByRole('heading', { level: 2, name: 'Applications per week' })).toBeVisible()
    const style = getComputedStyle(card)
    await expect(style.padding).toBe('24px')
    await expect(style.rowGap).toBe('16px')
  },
}

/** One Button or IconButton at the end of the header */
export const WithAction: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Recent applications</CardTitle>
          <Button variant="ghost">View all</Button>
        </CardHeader>
        {body}
      </>
    ),
  },
  play: async ({ canvas }) => {
    const card = canvas.getByRole('region', { name: 'Recent applications' })
    await expect(card).toContainElement(canvas.getByRole('button', { name: 'View all' }))
  },
}

/** The header pads itself above a divider; the body runs edge to edge */
export const Flush: Story = {
  args: {
    padding: 'flush',
    children: (
      <>
        <CardHeader>
          <CardTitle>Recent applications</CardTitle>
          <Button variant="ghost">View all</Button>
        </CardHeader>
        {jobList}
      </>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    const card = canvas.getByRole('region', { name: 'Recent applications' })
    await expect(getComputedStyle(card).padding).toBe('0px')
    const header = canvas.getByRole('heading').parentElement as HTMLElement
    const headerStyle = getComputedStyle(header)
    await expect(headerStyle.padding).toBe('16px 24px 15px')
    await expect(headerStyle.borderBottomWidth).toBe('1px')
    // Rows are as wide as the card
    const row = canvasElement.querySelector('li') as HTMLLIElement
    await expect(getComputedStyle(row).width).toBe(getComputedStyle(card).width)
  },
}

/** Without a title the section has no name, and isn't a landmark */
export const NoHeader: Story = {
  args: { children: body },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('region')).toBeNull()
    await expect(canvasElement.querySelector('section')).not.toHaveAttribute('aria-labelledby')
  },
}

/** The Figma pair: default and flush */
export const BothPaddings: Story = {
  decorators: [],
  render: () => (
    <div className="grid grid-cols-[repeat(2,--spacing(130))] items-start gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Applications per week</CardTitle>
        </CardHeader>
        {body}
      </Card>
      <Card padding="flush">
        <CardHeader>
          <CardTitle>Recent applications</CardTitle>
        </CardHeader>
        {jobList}
      </Card>
    </div>
  ),
  play: async ({ canvas }) => {
    // Header heights: the 28px title alone, and with flush's padding and divider (60px, as in Figma)
    const [defaultTitle, flushTitle] = canvas.getAllByRole('heading')
    await expect(getComputedStyle(defaultTitle.parentElement as HTMLElement).height).toBe('28px')
    await expect(getComputedStyle(flushTitle.parentElement as HTMLElement).height).toBe('60px')
  },
}

export const BothPaddingsDark: Story = {
  ...BothPaddings,
  globals: { theme: 'dark' },
}
