import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Badge } from '../Badge/Badge'
import { Timeline, TimelineItem } from './Timeline'

// The Figma example: a status history, newest first
const history = (
  <>
    <TimelineItem badge={<Badge tone="positive">Offer</Badge>} time="Oct 30, 2026 · 9:02 AM" dateTime="2026-10-30T09:02">
      Offer received: $185k base
    </TimelineItem>
    <TimelineItem
      badge={<Badge tone="warning">Interviewing</Badge>}
      time="Oct 9, 2026 · 3:14 PM"
      dateTime="2026-10-09T15:14"
    >
      Moved from Applied to Interviewing
    </TimelineItem>
    <TimelineItem badge={<Badge tone="info">Applied</Badge>} time="Oct 2, 2026 · 10:02 AM" dateTime="2026-10-02T10:02">
      Application created
    </TimelineItem>
  </>
)

const systemEvents = (
  <>
    <TimelineItem actor="system" time="Oct 16, 2026 · 2:00 AM" dateTime="2026-10-16T02:00">
      Marked Unlikely after 2 weeks with no status change
    </TimelineItem>
    <TimelineItem badge={<Badge tone="info">Applied</Badge>} time="Oct 2, 2026 · 10:02 AM" dateTime="2026-10-02T10:02">
      Application created
    </TimelineItem>
    <TimelineItem actor="system" time="Oct 2, 2026 · 10:01 AM" dateTime="2026-10-02T10:01">
      Logo fetched from the job post
    </TimelineItem>
  </>
)

// System events never take a badge; the types enforce it
void (
  // @ts-expect-error badge is not allowed with actor="system"
  <TimelineItem actor="system" badge={<Badge>Unlikely</Badge>} time="" dateTime="">
    Marked Unlikely
  </TimelineItem>
)

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: { children: history },
  argTypes: { children: { control: false } },
  // 560px on a surface, as in Figma
  decorators: [
    (Story) => (
      <div className="w-140 max-w-full rounded-sm bg-bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

const items = (canvasElement: HTMLElement) => Array.from(canvasElement.querySelectorAll('ol > li'))
const rail = (item: Element) => item.firstElementChild as HTMLElement
const marker = (item: Element) => rail(item).children[0] as HTMLElement
const line = (item: Element) => rail(item).children[1] as HTMLElement

/** A status history. Items with a badge are 84px; the last drops its line and is 48px. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('list')).toBeInTheDocument()
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3)

    const [first, , last] = items(canvasElement)
    await expect(getComputedStyle(first).height).toBe('84px')
    await expect(getComputedStyle(last).height).toBe('48px')
    await expect(getComputedStyle(line(first)).display).not.toBe('none')
    await expect(getComputedStyle(line(last)).display).toBe('none')
    await expect(rail(first)).toHaveAttribute('aria-hidden', 'true')

    const time = canvas.getByText('Oct 9, 2026 · 3:14 PM')
    await expect(time.tagName).toBe('TIME')
    await expect(time).toHaveAttribute('dateTime', '2026-10-09T15:14')
  },
}

/**
 * A change the app made on its own: hollow marker, text/muted, no badge. Without the badge the
 * item is 80px, and 44px last.
 */
export const SystemEvents: Story = {
  args: { children: systemEvents },
  play: async ({ canvasElement }) => {
    const [system, user, last] = items(canvasElement)
    await expect(getComputedStyle(system).height).toBe('80px')
    await expect(getComputedStyle(last).height).toBe('44px')
    await expect(system).toHaveClass('text-text-muted')
    await expect(user).toHaveClass('text-text-primary')

    // 1.5px, but Chromium snaps borders to device pixels, so it computes to 1px at 1x
    await expect(parseFloat(getComputedStyle(marker(system)).borderTopWidth)).toBeGreaterThan(0)
    await expect(getComputedStyle(marker(user)).borderTopWidth).toBe('0px')
  },
}

/** Long events wrap beside the badge; the timestamp stays under them */
export const LongEvent: Story = {
  decorators: [
    (Story) => (
      <div className="w-86">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <TimelineItem
        badge={
          <Badge tone="danger" appearance="soft">
            Rejected
          </Badge>
        }
        time="Oct 21, 2026 · 4:40 PM"
        dateTime="2026-10-21T16:40"
      >
        Moved from Interviewing to Rejected after the final round with the hiring manager
      </TimelineItem>
    ),
  },
  play: async ({ canvas }) => {
    const badge = canvas.getByText('Rejected')
    await expect(getComputedStyle(badge).whiteSpace).toBe('nowrap')
    await expect(parseFloat(getComputedStyle(canvas.getByRole('listitem')).height)).toBeGreaterThan(48)
  },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  args: { children: systemEvents },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3)
  },
}
