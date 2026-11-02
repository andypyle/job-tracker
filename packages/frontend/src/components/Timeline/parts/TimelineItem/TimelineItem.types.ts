import type { LiHTMLAttributes, ReactNode } from 'react'

interface TimelineItemBaseProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'children'> {
  /** What happened, in Body/Small. Plain text or inline content such as a link. */
  children: ReactNode
  /** When it happened, as shown: "Oct 9, 2026 · 3:14 PM". Caption/Regular, text/muted. */
  time: ReactNode
  /** The same moment for machines (ISO), on the `<time>` element */
  dateTime: string
}

interface TimelineUserItemProps extends TimelineItemBaseProps {
  /** A change a person made (default): solid marker, text/primary */
  actor?: 'user'
  /** Usually the new status, 8px before the event text */
  badge?: ReactNode
}

interface TimelineSystemItemProps extends TimelineItemBaseProps {
  /**
   * A change the app made on its own, such as marking an application Unlikely: hollow marker,
   * text/muted, and never a badge
   */
  actor: 'system'
  badge?: never
}

/** One event: the rail (marker and connecting line) beside the event line and its timestamp */
export type TimelineItemProps = TimelineUserItemProps | TimelineSystemItemProps
