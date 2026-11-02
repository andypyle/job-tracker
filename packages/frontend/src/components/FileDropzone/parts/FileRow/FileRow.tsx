import { cn } from '../../../../lib/cn'
import { IconButton } from '../../../IconButton/IconButton'
import type { FileRowProps, FileRowTone } from './FileRow.types'

const frameTones: Record<FileRowTone, string> = {
  default: 'border-border-default bg-bg-surface',
  positive: 'border-tone-positive-accent bg-bg-surface',
  error: 'border-feedback-error-strong bg-feedback-error-bg',
}

const captionTones: Record<FileRowTone, string> = {
  default: 'text-text-muted',
  positive: 'text-tone-positive-on-soft',
  error: 'text-feedback-error-text',
}

/** The 64px row FileDropzone shows once there's a file: icon, name, caption, x button */
export function FileRow({
  className,
  tone = 'default',
  icon,
  fileName,
  caption,
  percent,
  actionLabel,
  onAction,
  actionRef,
  ...props
}: FileRowProps) {
  return (
    <div
      className={cn(
        'flex h-16 items-center gap-3 rounded-sm border pr-1 pl-4',
        // Complete to Filled cross-fades the border over duration/base
        'transition-[background-color,border-color] duration-(--duration-base) ease-out',
        frameTones[tone],
        className,
      )}
      {...props}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-label-small text-text-primary">{fileName}</p>
        {percent !== undefined && (
          <div
            role="progressbar"
            aria-label={`Uploading ${fileName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1 overflow-hidden rounded-xs bg-bg-subtle"
          >
            <div
              className="h-full rounded-xs bg-brand-default transition-[width] duration-(--duration-base) ease-linear"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        {caption && (
          <p className={cn('truncate text-caption-regular', captionTones[tone])}>{caption}</p>
        )}
      </div>
      {actionLabel && (
        <IconButton
          ref={actionRef}
          icon="x"
          label={actionLabel}
          onClick={onAction}
          className="text-text-muted"
        />
      )}
    </div>
  )
}
