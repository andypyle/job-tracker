import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { fieldFrame } from '../../lib/classes'
import { useFieldControlProps } from '../FormField/FormField.context'
import type { TextareaProps } from './Textarea.types'

// Grows with its content from 3 lines (96px) to 8 (max-h-56), then scrolls. Browsers without
// field-sizing keep the 3-line height and scroll.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  const fieldProps = useFieldControlProps(props)

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'block max-h-56 min-h-24 w-full resize-none px-4 py-3 outline-none field-sizing-content placeholder:text-text-muted',
        fieldFrame,
        // Error wins over focus, so the problem stays visible while it's being fixed
        'focus:not-aria-invalid:border-border-focus focus:not-aria-invalid:inset-ring-1 focus:not-aria-invalid:inset-ring-border-focus',
        'aria-invalid:border-feedback-error-strong aria-invalid:inset-ring-1 aria-invalid:inset-ring-feedback-error-strong',
        'disabled:border-border-default disabled:bg-bg-subtle disabled:text-text-subtle disabled:inset-ring-0 disabled:placeholder:text-text-subtle',
        className,
      )}
      {...props}
      {...fieldProps}
    />
  )
})
