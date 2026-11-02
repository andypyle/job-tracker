import type { ButtonHTMLAttributes } from 'react'
import type { ISODate } from '../../../../lib/calendarDate'

export interface DayCellProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  date: ISODate
  selected?: boolean
  /** 1px border/strong plus semibold, aria-current="date" */
  today?: boolean
  /** In the previous or next month: dimmed (text/muted), still selectable */
  outside?: boolean
  /** Strikethrough plus aria-disabled. Still focusable, so the keyboard can move across it. */
  disabled?: boolean
}
