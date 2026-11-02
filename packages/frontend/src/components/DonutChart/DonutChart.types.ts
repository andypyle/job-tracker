import type { HTMLAttributes } from 'react'

export interface DonutChartDatum {
  label: string
  value: number
}

/** Parts of a whole: 2 to 5 categories, colored series-1 to series-5 in order */
export interface DonutChartProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 2 to 5 categories. With fewer or more, use a list or a BarChart instead. A zero value keeps
   * its legend row but draws no segment.
   */
  data: DonutChartDatum[]
  /** What the chart shows, for screen readers, e.g. "Applications by status" */
  label: string
  /** The number in the center. Defaults to the sum of the values. */
  total?: number
  /** Below the total, e.g. "applications" */
  totalLabel: string
}
