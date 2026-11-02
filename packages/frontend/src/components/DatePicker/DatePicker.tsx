import { forwardRef, useId, useMemo, useRef, useState, type FocusEvent } from 'react'
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover'
import {
  formatDisplayDate,
  parseDateInput,
  todayISO,
  weekStartForLocale,
  type ISODate,
} from '../../lib/calendarDate'
import { popoverMotion, popoverSurface } from '../../lib/classes'
import { cn } from '../../lib/cn'
import { mergeRefs } from '../../lib/mergeRefs'
import { IconButton } from '../IconButton/IconButton'
import { Input } from '../Input/Input'
import type { DatePickerProps } from './DatePicker.types'
import { Calendar } from './parts/Calendar/Calendar'

// The popover closes a beat after a day is chosen, so the choice registers
const CLOSE_DELAY_MS = 80

/**
 * A single date: type it ("Oct 21", 10/21/2026) or pick it from the calendar popover.
 * Typed text is read on blur or Enter and shown as "Oct 21, 2026".
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue,
    onChange,
    onInvalidInput,
    min,
    max,
    weekStart: weekStartProp,
    name,
    disabled,
    placeholder = 'e.g. Oct 21',
    className,
    onBlur,
    onKeyDown,
    ...props
  },
  ref,
) {
  const [uncontrolledValue, setUncontrolledValue] = useState<ISODate | null>(defaultValue ?? null)
  const value = valueProp !== undefined ? valueProp : uncontrolledValue
  const [text, setText] = useState(value ? formatDisplayDate(value) : '')
  const [invalid, setInvalid] = useState(false)
  const [open, setOpen] = useState(false)
  // Each open mounts a fresh calendar, focused on the value or today
  const [openCount, setOpenCount] = useState(0)
  const weekStart = useMemo(() => weekStartProp ?? weekStartForLocale(), [weekStartProp])
  const dialogId = useId()

  const fieldRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRefs = useMemo(() => mergeRefs(ref, inputRef), [ref])

  useAnchoredPopover({ open, onClose: () => setOpen(false), anchorRef: fieldRef, popoverRef })

  // A new value from outside replaces whatever was typed
  const [shownValue, setShownValue] = useState(value)
  if (value !== shownValue) {
    setShownValue(value)
    setText(value ? formatDisplayDate(value) : '')
    setInvalid(false)
  }

  const inRange = (date: ISODate) => (!min || date >= min) && (!max || date <= max)

  const commit = (next: ISODate | null) => {
    setInvalid(false)
    setText(next ? formatDisplayDate(next) : '')
    if (next !== value) {
      if (valueProp === undefined) setUncontrolledValue(next)
      onChange?.(next)
    }
  }

  const commitText = () => {
    if (!text.trim()) return commit(null)
    const parsed = parseDateInput(text)
    if (parsed && inRange(parsed)) return commit(parsed)
    setInvalid(true)
    onInvalidInput?.(text)
  }

  const close = (focusTarget: HTMLElement | null) => {
    setOpen(false)
    focusTarget?.focus()
  }

  // Tabbing out of the calendar closes it. A press outside is handled by useAnchoredPopover.
  const onPopoverBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null
    if (next && !popoverRef.current?.contains(next) && !fieldRef.current?.contains(next)) {
      setOpen(false)
    }
  }

  const today = todayISO()
  const initialFocus = value ?? (max && today > max ? max : min && today < min ? min : today)

  return (
    <div ref={fieldRef} className={cn('w-full', className)}>
      <Input
        ref={inputRefs}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        // While the calendar is open, the field keeps its focus border, as in Figma (error still wins)
        className={cn(
          open &&
            !invalid &&
            !props['aria-invalid'] &&
            'border-border-focus inset-ring-1 inset-ring-border-focus',
        )}
        {...props}
        aria-invalid={invalid ? true : props['aria-invalid']}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => {
          commitText()
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitText()
          onKeyDown?.(event)
        }}
        trailing={
          <IconButton
            ref={buttonRef}
            icon="calendar"
            label="Choose date"
            className="size-10"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={dialogId}
            onClick={() => {
              if (open) return setOpen(false)
              setOpenCount((count) => count + 1)
              setOpen(true)
            }}
          />
        }
      />
      <div
        ref={popoverRef}
        id={dialogId}
        role="dialog"
        aria-label="Choose date"
        popover="manual"
        onBlur={onPopoverBlur}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          // Only the calendar closes, not a dialog around it
          event.preventDefault()
          event.stopPropagation()
          close(buttonRef.current)
        }}
        className={cn(popoverSurface, 'p-3', popoverMotion)}
      >
        {openCount > 0 && (
          <Calendar
            key={openCount}
            value={value}
            initialFocus={initialFocus}
            min={min}
            max={max}
            weekStart={weekStart}
            onSelect={(date) => {
              commit(date)
              window.setTimeout(() => close(inputRef.current), CLOSE_DELAY_MS)
            }}
            onClear={() => {
              commit(null)
              close(inputRef.current)
            }}
          />
        )}
      </div>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
    </div>
  )
})
