import type { LiHTMLAttributes, ReactNode } from 'react'

export type ChartSeries = 1 | 2 | 3 | 4 | 5

export interface ChartLegendItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'value'> {
  /** Which color/chart/series-n the swatch shows */
  series: ChartSeries
  /** Body/Small, text/primary */
  label: ReactNode
  /** Body/Small, text/muted */
  value: ReactNode
}
