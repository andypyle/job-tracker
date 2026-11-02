import type { HTMLAttributes } from 'react'

export interface BarChartDatum {
  /** The x label, e.g. "Sep 1" */
  label: string
  value: number
}

/** One series over time: a bar per datum, in order, sharing the width equally */
export interface BarChartProps extends HTMLAttributes<HTMLDivElement> {
  data: BarChartDatum[]
  /**
   * What the chart shows, for screen readers, e.g. "42 applications over 8 weeks, peak 8 on
   * Oct 6". Each bar also reads its own label and value.
   */
  label: string
  /** How a value reads in the hover label and to screen readers. Defaults to the plain number. */
  formatValue?: (value: number) => string
}
