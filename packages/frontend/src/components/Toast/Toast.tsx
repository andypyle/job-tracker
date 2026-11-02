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
      {(action || onDismiss) && (
        // The 44px targets center on the 22px title line (-11px each way keeps the toast 80px) and
        // sit side by side. The action's padding drops to 12px, matching the icon's inset, so the
        // visible gaps (text to action, action to ×) are both 24px (deviation: Figma's 20px action
        // padding leaves 44px before the ×). Centering puts the targets 5px below the top edge, so
        // -3px on the right (into the 8px padding) gives the same 5px there: the × glyph sits
        // 17px from the top and from the right.
        <div className="-my-2.75 -mr-0.75 flex shrink-0 items-center">
          {action && <div className="*:px-3">{action}</div>}
          {onDismiss && <IconButton icon="x" label="Dismiss notification" onClick={onDismiss} />}
        </div>
      )}
    </div>
  )
})
