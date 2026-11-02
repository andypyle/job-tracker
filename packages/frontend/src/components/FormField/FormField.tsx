import { useId } from 'react'
import { cn } from '../../lib/cn'
import { FormFieldContext } from './FormField.context'
import type { FormFieldProps } from './FormField.types'

export function FormField({
  className,
  label,
  optional,
  hint,
  error,
  htmlFor,
  children,
  ...props
}: FormFieldProps) {
  const generatedId = useId()
  const id = htmlFor ?? generatedId
  const labelId = `${id}-label`
  const messageId = `${id}-message`
  // The error replaces the hint, so the message slot holds one or the other
  const message = error || hint

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <label id={labelId} htmlFor={id} className="flex items-center gap-1 text-label-small text-text-primary">
        {label}
        {optional && <span className="text-caption-regular text-text-muted">Optional</span>}
      </label>
      <FormFieldContext.Provider
        value={{ id, labelId, describedBy: message ? messageId : undefined, invalid: Boolean(error) }}
      >
        {children}
      </FormFieldContext.Provider>
      {message && (
        <p
          id={messageId}
          className={cn(
            'text-caption-regular',
            error ? 'text-feedback-error-text' : 'text-text-muted',
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
