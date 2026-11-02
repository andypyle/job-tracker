import { useCountUp } from '../../hooks/useCountUp'
import { cn } from '../../lib/cn'
import type { StatProps } from './Stat.types'
import { statTextColors, statVariants } from './Stat.variants'

const defaultFormat = (n: number) => n.toLocaleString()

export function Stat({
  className,
  tone,
  emphasis,
  label,
  value,
  sublabel,
  loading = false,
  format = defaultFormat,
  ...props
}: StatProps) {
  const counted = useCountUp(loading || typeof value !== 'number' ? null : value)

  if (loading) {
    // Figma has one loading look, the neutral subtle surface, whatever the tone and emphasis
    return (
      <div
        aria-busy="true"
        className={cn(statVariants({ tone: 'neutral', emphasis: 'subtle' }), 'min-w-0 gap-0', className)}
        {...props}
      >
        <span className="sr-only">{label}: loading</span>
        <div aria-hidden="true" className="flex flex-col animate-pulse-opacity">
          <div className="h-3 w-20 rounded-xs bg-bg-skeleton" />
          <div className="mt-3 h-8 w-16 rounded-xs bg-bg-skeleton" />
          <div className="mt-2 h-2.5 w-24 rounded-xs bg-bg-subtle" />
        </div>
      </div>
    )
  }

  const colors = statTextColors(tone ?? 'neutral', emphasis ?? 'subtle')
  const shown = typeof value === 'number' ? format(counted ?? value) : value
  const final = typeof value === 'number' ? format(value) : value

  return (
    <div className={cn(statVariants({ tone, emphasis }), 'min-w-0', className)} {...props}>
      <p className={cn('truncate text-label-small', colors.muted)}>{label}</p>
      <p className={cn('font-display text-display-stat whitespace-nowrap tabular-nums', colors.value)}>
        {/* Screen readers get the final value, not the frames of the count */}
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{final}</span>
      </p>
      {sublabel && <p className={cn('truncate text-caption-regular', colors.muted)}>{sublabel}</p>}
    </div>
  )
}
