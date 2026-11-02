import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { IconName } from '../Icon/Icon.paths'
import { IconButton } from '../IconButton/IconButton'
import type { Tone } from '../../lib/tone'
import type { ToastProps } from './Toast.types'
import { toastIconColor, toastVariants } from './Toast.variants'

const icons: Record<Tone, IconName> = {
  neutral: 'info',
  info: 'info',
  warning: 'alert-triangle',
  positive: 'check-circle',
  danger: 'alert-circle',
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { className, tone = 'neutral', title, message, action, onDismiss, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-atomic
      className={cn(toastVariants({ tone }), className)}
      {...props}
    >
      {/* The 20px icon centers on the 22px title line */}
      <Icon name={icons[tone]} size={20} className={cn('mt-px shrink-0', toastIconColor[tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-title-base">{title}</p>
        {message && <p className="text-body-small text-text-on-band-muted">{message}</p>}
      </div>
      {action && <div className="-my-2.5 shrink-0">{action}</div>}
      {onDismiss && (
        // A 44px target drawn where Figma's 32px button sits: the negative margins keep the toast 80px
        <IconButton icon="x" label="Dismiss notification" onClick={onDismiss} className="-my-1.5 -mr-1.5" />
      )}
    </div>
  )
})
