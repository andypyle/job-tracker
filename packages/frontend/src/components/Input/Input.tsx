import { forwardRef, type PointerEvent } from 'react'
import { cn } from '../../lib/cn'
import { fieldFrame } from '../../lib/classes'
import { useFieldControlProps } from '../FormField/FormField.context'
import { Icon } from '../Icon/Icon'
import type { InputProps } from './Input.types'

// Pressing the padding or the leading icon focuses the input, as if the box were the input
function focusInput(event: PointerEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement
  if (target.closest('input, button, a')) return
  event.preventDefault()
  event.currentTarget.querySelector('input')?.focus()
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leadingIcon, trailing, type = 'text', ...props },
  ref,
) {
  const fieldProps = useFieldControlProps(props)

  return (
    <div
      onPointerDown={focusInput}
      className={cn(
        'flex h-12 w-full cursor-text items-center gap-2 pl-4',
        trailing ? 'pr-1' : 'pr-4',
        fieldFrame,
        // Error wins over focus, so the problem stays visible while it's being fixed
        'has-[input:focus:not([aria-invalid=true])]:border-border-focus has-[input:focus:not([aria-invalid=true])]:inset-ring-1 has-[input:focus:not([aria-invalid=true])]:inset-ring-border-focus',
        'has-[input[aria-invalid=true]]:border-feedback-error-strong has-[input[aria-invalid=true]]:inset-ring-1 has-[input[aria-invalid=true]]:inset-ring-feedback-error-strong',
        'has-[input:disabled]:cursor-default has-[input:disabled]:border-border-default has-[input:disabled]:bg-bg-subtle has-[input:disabled]:inset-ring-0',
        className,
      )}
    >
      {leadingIcon && <Icon name={leadingIcon} size={16} className="text-text-muted" />}
      <input
        ref={ref}
        type={type}
        className="h-full min-w-0 flex-1 truncate bg-transparent outline-none placeholder:text-text-muted disabled:text-text-subtle disabled:placeholder:text-text-subtle"
        {...props}
        {...fieldProps}
      />
      {trailing}
    </div>
  )
})
