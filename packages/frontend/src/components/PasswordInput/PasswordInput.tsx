import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { mergeRefs } from '../../lib/mergeRefs'
import { IconButton } from '../IconButton/IconButton'
import { Input } from '../Input/Input'
import type { PasswordInputProps } from './PasswordInput.types'

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { autoComplete = 'current-password', disabled, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const setRefs = useMemo(() => mergeRefs(ref, inputRef), [ref])
  const selection = useRef<[number | null, number | null] | null>(null)

  // Changing the type can reset the cursor, so put it back where it was
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || !selection.current) return
    input.setSelectionRange(...selection.current)
    selection.current = null
  }, [visible])

  const toggle = () => {
    const input = inputRef.current
    if (input) selection.current = [input.selectionStart, input.selectionEnd]
    setVisible(!visible)
  }

  return (
    <Input
      ref={setRefs}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      {...props}
      trailing={
        <IconButton
          icon="eye"
          label="Show password"
          aria-pressed={visible}
          // `visibility` rests on eye and ends on eye-off: eye while hidden, eye-off while shown
          active={visible}
          disabled={disabled}
          // A mouse press keeps focus (and the cursor) in the input; keyboard users stay on the button
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggle}
          className="size-10 text-text-muted"
        />
      }
    />
  )
})
