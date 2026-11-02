import type { ISODate } from '../../../../lib/calendarDate'

export interface CalendarProps {
  value: ISODate | null
  /** The day that takes focus when the calendar mounts */
  initialFocus: ISODate
  min?: ISODate
  max?: ISODate
  /** 0 is Sunday */
  weekStart: number
  onSelect: (date: ISODate) => void
  onClear: () => void
}
