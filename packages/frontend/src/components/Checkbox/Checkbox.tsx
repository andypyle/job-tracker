import { forwardRef, useEffect, useId, useMemo, useRef } from 'react'
import { cn } from '../../lib/cn'
import { mergeRefs } from '../../lib/mergeRefs'
import type { CheckboxProps } from './Checkbox.types'

// State colors, set on the row as custom properties so the nested box, fill and mark can use
// them. Later variants win (Tailwind orders `has-*` after `hover`), so disabled and error
// override hover.
const stateColors = [
  '[--box-bg:var(--color-bg-surface)] [--box-ring:var(--color-border-strong)] [--box-fill:var(--color-brand-default)] [--box-mark:var(--color-text-on-brand)]',
  'hover:[--box-bg:var(--color-bg-hover)] hover:[--box-ring:var(--color-brand-default)] hover:[--box-fill:var(--color-brand-hover)]',
  'has-aria-invalid:[--box-ring:var(--color-feedback-error-strong)] has-aria-invalid:[--box-fill:var(--color-feedback-error-strong)] has-aria-invalid:[--box-mark:var(--color-text-on-band)]',
  'has-disabled:[--box-bg:var(--color-bg-subtle)] has-disabled:[--box-ring:var(--color-border-default)] has-disabled:[--box-fill:var(--color-text-subtle)] has-disabled:[--box-mark:var(--color-text-on-band)]',
]

// Fill: grows from an 8px square (scale 0.4) with a bounce; shrinks back after the mark
// retracts (40ms in), with no bounce. Transitions, not keyframes, so a double-click reverses.
// Reduced motion: opacity and color only, 100ms.
const fillMotion = [
  'scale-40 opacity-0 [transition:scale_var(--duration-fast)_var(--ease-in)_40ms,opacity_var(--duration-fast)_var(--ease-in)_40ms,background-color_var(--duration-fast)_var(--ease-out)]',
  'group-has-checked:scale-100 group-has-checked:opacity-100 group-has-checked:[transition:scale_var(--duration-base)_var(--ease-bounce),opacity_var(--duration-base)_var(--ease-bounce),background-color_var(--duration-fast)_var(--ease-out)]',
  'group-has-indeterminate:scale-100 group-has-indeterminate:opacity-100 group-has-indeterminate:[transition:scale_var(--duration-base)_var(--ease-bounce),opacity_var(--duration-base)_var(--ease-bounce),background-color_var(--duration-fast)_var(--ease-out)]',
  'motion-reduce:scale-100 motion-reduce:[transition:opacity_100ms_ease-out,background-color_100ms_ease-out]',
]

// Check: draws in over 160ms starting 60ms in; retracts over 100ms. Opacity hides the round
// cap's dot once retracted.
const checkMotion = [
  '[stroke-dasharray:1] [stroke-dashoffset:1] opacity-0 [transition:stroke-dashoffset_100ms_var(--ease-in),opacity_0s_linear_100ms]',
  'group-has-[:checked:not(:indeterminate)]:[stroke-dashoffset:0] group-has-[:checked:not(:indeterminate)]:opacity-100 group-has-[:checked:not(:indeterminate)]:[transition:stroke-dashoffset_160ms_var(--ease-out)_60ms,opacity_0s_linear_60ms]',
  'motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_100ms_ease-out]',
]

// Dash: grows from the center (scaleX 0 to 1) on the same timings as the check
const dashMotion = [
  'origin-center scale-x-0 [transform-box:fill-box] [transition:scale_100ms_var(--ease-in)]',
  'group-has-indeterminate:scale-x-100 group-has-indeterminate:[transition:scale_160ms_var(--ease-out)_60ms]',
  'motion-reduce:scale-x-100 motion-reduce:opacity-0 motion-reduce:group-has-indeterminate:opacity-100 motion-reduce:[transition:opacity_100ms_ease-out]',
]

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, error, indeterminate = false, disabled, 'aria-describedby': describedBy, ...props },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const setRefs = useMemo(() => mergeRefs(ref, inputRef), [ref])
  const messageId = useId()
  const message = error || description

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 py-2.5 has-disabled:cursor-default',
        stateColors,
        className,
      )}
    >
      <input
        ref={setRefs}
        type="checkbox"
        disabled={disabled}
        aria-invalid={error && !disabled ? true : undefined}
        aria-describedby={
          [message && messageId, describedBy].filter(Boolean).join(' ') || undefined
        }
        className="peer sr-only"
        {...props}
      />
      {/* 24px focus slot around the 20px box */}
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-md outline-offset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-border-focus"
      >
        <span
          className={cn(
            'relative size-5 overflow-hidden rounded-sm bg-(--box-bg) inset-ring-2 inset-ring-(--box-ring)',
            // The border cross-fades to the fill color as the fill grows
            'group-has-checked:inset-ring-(--box-fill) group-has-indeterminate:inset-ring-(--box-fill)',
            'transition-[background-color,box-shadow] duration-(--duration-fast) ease-out',
          )}
        >
          <span className={cn('absolute inset-0 rounded-xs bg-(--box-fill)', fillMotion)} />
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="var(--box-mark)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute inset-0 size-5"
          >
            <path d="M5 10.4L8.4 13.8L15 7" pathLength={1} className={cn(checkMotion)} />
            <path d="M6 10H14" className={cn(dashMotion)} />
          </svg>
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body-base text-text-primary group-has-disabled:text-text-subtle">
          {label}
        </span>
        {message && (
          <span
            id={messageId}
            className={cn(
              'text-body-small',
              error ? 'text-feedback-error-text' : 'text-text-muted',
              'group-has-disabled:text-text-subtle',
            )}
          >
            {message}
          </span>
        )}
      </span>
    </label>
  )
})
