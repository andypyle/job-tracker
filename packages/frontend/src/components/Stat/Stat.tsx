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
        {/* Each bar sits in a box the height of the line it stands for, 4px apart as in the
            loaded stat, so the stat keeps its size when the value arrives */}
        <div aria-hidden="true" className="flex flex-col gap-1 animate-pulse-opacity">
          <div className="flex h-5 items-center">
            <div className="h-3 w-20 rounded-xs bg-bg-skeleton" />
          </div>
          <div className="flex h-10 items-center md:h-12">
            <div className="h-8 w-16 rounded-xs bg-bg-skeleton" />
          </div>
          {sublabel && (
            <div className="flex h-4 items-center">
              <div className="h-2.5 w-24 rounded-xs bg-bg-subtle" />
            </div>
          )}
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
      {/* Below md the value drops to Heading/H1, as in the mobile Dashboard */}
      <p className={cn('font-display text-heading-h1 whitespace-nowrap md:text-display-stat tabular-nums', colors.value)}>
        {/* Screen readers get the final value, not the frames of the count */}
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{final}</span>
      </p>
      {sublabel && <p className={cn('truncate text-caption-regular', colors.muted)}>{sublabel}</p>}
    </div>
  )
}
