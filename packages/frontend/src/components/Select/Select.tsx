import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactElement,
  type Ref,
} from 'react'
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover'
import { mergeRefs } from '../../lib/mergeRefs'
import { FormFieldContext, useFieldControlProps } from '../FormField/FormField.context'
import { BadgeTrigger } from './parts/BadgeTrigger/BadgeTrigger'
import { Menu } from './parts/Menu/Menu'
import { Option } from './parts/Option/Option'
import { Trigger } from './parts/Trigger/Trigger'
import type { SelectProps } from './Select.types'

const MENU_MIN_WIDTH = 200
const TYPEAHEAD_RESET_MS = 500

function SelectInner<V extends string>(props: SelectProps<V>, ref: ForwardedRef<HTMLButtonElement>) {
  const {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    onBlur,
    placeholder = 'Choose an option',
    appearance = 'field',
    disabled,
    busy = false,
    name,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props
  const fieldProps = useFieldControlProps(props)
  const field = useContext(FormFieldContext)
  const listboxId = useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const [uncontrolledValue, setUncontrolledValue] = useState<V | null>(defaultValue ?? null)
  const value = valueProp !== undefined ? valueProp : uncontrolledValue
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options[selectedIndex]

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', timer: 0 })
  const triggerRefs = useMemo(() => mergeRefs(ref, triggerRef), [ref])

  // The next enabled option from `from` in direction `dir`, or `from` when there is none
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
      if (!options[i].disabled) return i
    }
    return from
  }
  const first = step(-1, 1)
  const last = step(options.length, -1)

  // Typing jumps to a match. Repeating one letter cycles through the options that start with it.
  const findMatch = (key: string, from: number) => {
    const buffer = typeahead.current
    window.clearTimeout(buffer.timer)
    buffer.text += key.toLowerCase()
    buffer.timer = window.setTimeout(() => (buffer.text = ''), TYPEAHEAD_RESET_MS)
    const repeated = [...buffer.text].every((char) => char === buffer.text[0])
    const search = repeated ? buffer.text[0] : buffer.text
    const start = repeated ? from + 1 : Math.max(from, 0)
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length
      if (!options[i].disabled && options[i].label.toLowerCase().startsWith(search)) return i
    }
    return -1
  }

  // Width matches the trigger, min 200; max height 320, then it scrolls
  useAnchoredPopover({
    open,
    onClose: () => setOpen(false),
    anchorRef: triggerRef,
    popoverRef: menuRef,
    minWidth: MENU_MIN_WIDTH,
    scrollable: true,
  })

  useEffect(() => {
    if (open && activeIndex >= 0) {
      menuRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  useEffect(() => {
    if (busy) setOpen(false)
  }, [busy])

  const openAt = (index: number) => {
    setActiveIndex(index)
    setOpen(true)
    // Safari doesn't focus buttons on click; the keyboard handling lives on the trigger
    triggerRef.current?.focus()
  }

  const commit = (index: number) => {
    const option = options[index]
    setOpen(false)
    if (!option || option.disabled) return
    if (option.value !== value) {
      if (valueProp === undefined) setUncontrolledValue(option.value)
      onChange?.(option.value)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

    if (busy) return
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openAt(selectedIndex >= 0 ? selectedIndex : first)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openAt(last)
      } else if (printable) {
        const match = findMatch(event.key, selectedIndex)
        if (match >= 0) openAt(match)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => step(index, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index < 0 ? last : step(index, -1)))
        break
      case 'Home':
      case 'PageUp':
        event.preventDefault()
        setActiveIndex(first)
        break
      case 'End':
      case 'PageDown':
        event.preventDefault()
        setActiveIndex(last)
        break
      case 'Enter':
        event.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        // Only the menu closes, not a dialog around it
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        break
      case 'Tab':
        // Selects the highlighted option, then focus moves on as usual
        commit(activeIndex)
        break
      default:
        // Space selects, unless it's part of a typeahead search
        if (event.key === ' ' && !typeahead.current.text) {
          event.preventDefault()
          commit(activeIndex)
        } else if (printable) {
          event.preventDefault()
          const match = findMatch(event.key, activeIndex)
          if (match >= 0) setActiveIndex(match)
        }
    }
  }

  const triggerProps = {
    ref: triggerRefs,
    ...fieldProps,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    role: 'combobox',
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': open,
    'aria-controls': listboxId,
    'aria-activedescendant': open && activeIndex >= 0 ? optionId(activeIndex) : undefined,
    disabled,
    'aria-disabled': busy || undefined,
    'aria-busy': busy || undefined,
    className,
    onKeyDown,
    onClick: () => {
      if (busy) return
      if (open) setOpen(false)
      else openAt(selectedIndex >= 0 ? selectedIndex : first)
    },
    onBlur: () => {
      setOpen(false)
      onBlur?.()
    },
  }

  return (
    <>
      {appearance === 'badge' ? (
        <BadgeTrigger
          {...triggerProps}
          label={selected?.label ?? placeholder}
          tone={selected?.tone ?? 'neutral'}
          appearance={selected ? (selected.badgeAppearance ?? 'solid') : 'outline'}
        />
      ) : (
        <Trigger {...triggerProps} placeholder={placeholder} valueLabel={selected?.label} />
      )}
      <Menu
        ref={menuRef}
        id={listboxId}
        aria-labelledby={field?.labelId ?? ariaLabelledBy}
        aria-label={field || ariaLabelledBy ? undefined : ariaLabel}
        // Keep focus on the trigger, which owns the keyboard (aria-activedescendant)
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
      >
        {options.map((option, index) => (
          <Option
            key={option.value}
            id={optionId(index)}
            label={option.label}
            tone={option.tone}
            disabled={option.disabled}
            selected={index === selectedIndex}
            active={index === activeIndex}
            onPointerMove={() => {
              if (!option.disabled && index !== activeIndex) setActiveIndex(index)
            }}
            onClick={() => {
              if (!option.disabled) commit(index)
            }}
          />
        ))}
      </Menu>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
    </>
  )
}

/**
 * A single-select for 4–15 known options: a trigger plus a listbox in a popover.
 * Focus stays on the trigger; the highlighted option is its aria-activedescendant.
 */
export const Select = forwardRef(SelectInner) as <V extends string = string>(
  props: SelectProps<V> & { ref?: Ref<HTMLButtonElement> },
) => ReactElement
