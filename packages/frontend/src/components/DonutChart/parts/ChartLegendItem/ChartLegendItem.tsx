import { cn } from '../../../../lib/cn'
import type { ChartLegendItemProps, ChartSeries } from './ChartLegendItem.types'

const seriesFill: Record<ChartSeries, string> = {
  1: 'bg-chart-series-1',
  2: 'bg-chart-series-2',
  3: 'bg-chart-series-3',
  4: 'bg-chart-series-4',
  5: 'bg-chart-series-5',
}

/** A 10px series swatch, then the label and value, 8px apart. The text carries the meaning. */
export function ChartLegendItem({ className, series, label, value, ...props }: ChartLegendItemProps) {
  return (
    <li className={cn('flex items-center gap-2 text-body-small whitespace-nowrap', className)} {...props}>
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-xs', seriesFill[series])} />
      <span className="text-text-primary">{label}</span>
      <span className="text-text-muted">{value}</span>
    </li>
  )
}
