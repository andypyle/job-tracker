import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  daysIntoWeek,
  formatMonth,
  monthGrid,
  startOfMonth,
  todayISO,
  type ISODate,
} from '../../../../lib/calendarDate'
import { cn } from '../../../../lib/cn'
import { Button } from '../../../Button/Button'
import { IconButton } from '../../../IconButton/IconButton'
import { DayCell } from '../DayCell/DayCell'
import type { CalendarProps } from './Calendar.types'

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

// Six rows of seven, from the week start
function weeks(month: ISODate, weekStart: number) {
  const days = monthGrid(month, weekStart)
  return Array.from({ length: 6 }, (_, row) => days.slice(row * 7, row * 7 + 7))
}

export function Calendar({ value, initialFocus, min, max, weekStart, onSelect, onClear }: CalendarProps) {
  const today = todayISO()
  const titleId = useId()
  // The live month's rows, not the one sliding out (both can hold the same date)
  const gridRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(initialFocus)
  // Day buttons take focus on mount and after keyboard moves, not after the month buttons
  const moveFocus = useRef(true)
  const month = startOfMonth(focused)

  // When the month changes, the old one stays a moment to slide out
  const [shown, setShown] = useState({ month, previous: null as ISODate | null, direction: 0 })
  if (shown.month !== month) {
    setShown({ month, previous: shown.month, direction: month > shown.month ? 1 : -1 })
  }

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
  }, [focused])

  const inRange = (date: ISODate) => (!min || date >= min) && (!max || date <= max)

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, () => ISODate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -daysIntoWeek(focused, weekStart)),
      End: () => addDays(focused, 6 - daysIntoWeek(focused, weekStart)),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    moveFocus.current = true
    setFocused(move())
  }

  // `interactive` is false for the month sliding out, which only needs to look the same
  const renderDay = (date: ISODate, gridMonth: ISODate, interactive: boolean) => (
    <DayCell
      key={date}
      date={date}
      selected={date === value}
      today={date === today}
      outside={!date.startsWith(gridMonth.slice(0, 7))}
      disabled={!inRange(date)}
      tabIndex={interactive && date === focused ? 0 : -1}
      onClick={interactive ? () => onSelect(date) : undefined}
      // Keep the roving focus in step when a day is focused by pointer. Days in another month
      // are left out: switching months here would swap the grid out from under the click.
      onFocus={
        interactive && date.startsWith(month.slice(0, 7)) ? () => setFocused(date) : undefined
      }
    />
  )

  // Next month comes in from the right; reduced motion keeps only a 100ms cross-fade
  const slide = {
    '--slide': `${shown.direction * 12}px`,
  } as CSSProperties
  const sliding = 'motion-reduce:[--slide:0px] motion-reduce:[animation-duration:100ms]'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <IconButton
          icon="chevron-left"
          label="Previous month"
          onClick={() => setFocused(addMonths(focused, -1))}
        />
        <div id={titleId} aria-live="polite" className="flex-1 text-center font-display text-heading-h3">
          <span
            key={month}
            className="inline-block transition-opacity duration-(--duration-base) ease-out starting:opacity-0"
          >
            {formatMonth(month)}
          </span>
        </div>
        <IconButton
          icon="chevron-right"
          label="Next month"
          onClick={() => setFocused(addMonths(focused, 1))}
        />
      </div>

      <div role="grid" aria-labelledby={titleId} onKeyDown={onKeyDown} className="flex flex-col">
        <div role="row" className="flex">
          {weeks(month, weekStart)[0].map((date) => {
            const weekday = weekdayFormat.format(new Date(`${date}T12:00`))
            return (
              <div
                key={weekday}
                role="columnheader"
                aria-label={weekday}
                className="flex h-6 w-11 items-center justify-center text-caption-medium text-text-muted"
              >
                {weekday.slice(0, 2)}
              </div>
            )
          })}
        </div>
        <div style={slide} className="relative mt-2 overflow-hidden">
          {shown.previous && (
            <div
              key={shown.previous}
              aria-hidden
              className={cn('pointer-events-none absolute inset-0 animate-slide-out', sliding)}
              onAnimationEnd={() => setShown((current) => ({ ...current, previous: null }))}
            >
              {weeks(shown.previous, weekStart).map((week) => (
                <div key={week[0]} className="flex">
                  {week.map((date) => renderDay(date, shown.previous!, false))}
                </div>
              ))}
            </div>
          )}
          <div key={month} ref={gridRef} className={cn(shown.previous && 'animate-slide-in', sliding)}>
            {weeks(month, weekStart).map((week) => (
              <div key={week[0]} role="row" className="flex">
                {week.map((date) => renderDay(date, month, true))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={!inRange(today)} onClick={() => onSelect(today)}>
          Today
        </Button>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}
