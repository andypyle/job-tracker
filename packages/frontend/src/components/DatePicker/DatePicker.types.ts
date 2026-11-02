import type { InputHTMLAttributes } from 'react'
import type { ISODate } from '../../lib/calendarDate'

export interface DatePickerProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'
  > {
  /** Controlled value as YYYY-MM-DD; `null` is empty */
  value?: ISODate | null
  defaultValue?: ISODate
  /** A date picked or typed (on blur or Enter), or `null` when cleared */
  onChange?: (value: ISODate | null) => void
  /**
   * Typed text that isn't a date, or falls outside min/max. The field shows its error state
   * until the text is fixed; put the message in the surrounding FormField.
   */
  onInvalidInput?: (text: string) => void
  /** Earliest selectable day (YYYY-MM-DD) */
  min?: ISODate
  /** Latest selectable day. "Date applied" passes today, since you can't apply tomorrow. */
  max?: ISODate
  /** First day of the week, 0 for Sunday. Defaults to the browser locale's. */
  weekStart?: number
  /** Classes for the field box (width, margins). The ref and other props go to the `<input>`. */
  className?: string
}
