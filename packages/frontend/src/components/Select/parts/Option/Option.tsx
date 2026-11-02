import { cn } from '../../../../lib/cn'
import { Icon } from '../../../Icon/Icon'
import { Swatch } from '../../../Swatch/Swatch'
import type { OptionProps } from './Option.types'

export function Option({ className, label, active, selected, disabled, tone, ...props }: OptionProps) {
  return (
    <div
      role="option"
      aria-selected={Boolean(selected)}
      aria-disabled={disabled || undefined}
      className={cn(
        'flex h-11 cursor-pointer items-center gap-2 rounded-xs px-3 text-body-base/5 text-text-primary select-none',
        // Only the highlight's background fades; options never move
        'transition-[background-color] duration-80 ease-linear',
        active && 'bg-bg-nav-active',
        selected && 'font-semibold',
        disabled && 'cursor-default text-text-subtle',
        className,
      )}
      {...props}
    >
      {tone && <Swatch tone={tone} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Icon name="check" size={16} />}
    </div>
  )
}
