import { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { IconName } from '../Icon/Icon.paths'
import type { AlertProps } from './Alert.types'
import { alertIconColor, alertVariants } from './Alert.variants'

const icons: Record<NonNullable<AlertProps['tone']>, IconName> = {
  danger: 'alert-circle',
  warning: 'alert-triangle',
  info: 'info',
  positive: 'check-circle',
}

/**
 * After a failed submit, move focus here with the ref (it has tabIndex -1), so keyboard and
 * screen reader users land on the message.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, tone = 'danger', children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={tone === 'danger' ? 'alert' : 'status'}
      tabIndex={-1}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      {/* The 20px icon centers on the first 24px line */}
      <Icon name={icons[tone]} size={20} className={cn('mt-0.5 shrink-0', alertIconColor[tone])} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
})
