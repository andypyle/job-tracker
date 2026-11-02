import { useEffect, useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { useCountUp } from '../../hooks/useCountUp'
import { prefersReducedMotion } from '../../lib/motion'
import type { DonutChartProps } from './DonutChart.types'
import type { ChartSeries } from './parts/ChartLegendItem/ChartLegendItem.types'
import { ChartLegendItem } from './parts/ChartLegendItem/ChartLegendItem'

export { ChartLegendItem } from './parts/ChartLegendItem/ChartLegendItem'

// The 180px ring from Figma: outer radius 90, 34.2 thick, so the stroke runs along r = 72.9.
// Each segment stops 1.7° short of its share, the gap between segments. Strokes use
// pathLength 360, so dash lengths and offsets are in degrees.
const SIZE = 180
const THICKNESS = 34.2
const RADIUS = SIZE / 2 - THICKNESS / 2
const GAP = 1.7

const seriesStroke: Record<ChartSeries, string> = {
  1: 'stroke-chart-series-1',
  2: 'stroke-chart-series-2',
  3: 'stroke-chart-series-3',
  4: 'stroke-chart-series-4',
  5: 'stroke-chart-series-5',
}

/**
 * SVG circles with stroke-dasharray, starting at 12 o'clock, beside a legend of real text, so the
 * chart reads without color. On mount the ring sweeps in clockwise (a mask over 600ms, ease/out)
 * while the total counts up from 0; reduced motion shows both at once.
 */
export function DonutChart({ className, data, label, total, totalLabel, ...props }: DonutChartProps) {
  const maskId = `donut-${useId().replace(/:/g, '')}`
  const sum = data.reduce((acc, d) => acc + d.value, 0)
  const shownTotal = total ?? sum

  // Count up from 0 on mount: useCountUp shows its first value as is, so start it at null
  const [started, setStarted] = useState(prefersReducedMotion)
  useEffect(() => setStarted(true), [])
  const counted = useCountUp(started ? shownTotal : null)

  useEffect(() => {
    if (import.meta.env.DEV && (data.length < 2 || data.length > 5)) {
      console.warn(`DonutChart: ${data.length} categories; use 2 to 5, or a list or BarChart instead`)
    }
  }, [data.length])

  let start = 0
  const segments = data.map((datum, index) => {
    const sweep = sum ? (datum.value / sum) * 360 : 0
    const segment = { series: ((index % 5) + 1) as ChartSeries, start, length: Math.max(sweep - GAP, 0) }
    start += sweep
    return segment
  })

  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap items-center gap-8', className)} {...props}>
      <div className="relative size-45 shrink-0">
        <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full">
          {/* The default mask region is the stroke-less bounding box plus 10%, which would cut
              2.5px off the ring's outer edge, so cover the whole canvas instead */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-2} y={-2} width={SIZE + 4} height={SIZE + 4}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="white"
              strokeWidth={THICKNESS + 2}
              pathLength={360}
              strokeDasharray="360 360"
              className="motion-safe:animate-sweep"
            />
          </mask>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} mask={`url(#${maskId})`}>
            {segments.map(
              (segment, index) =>
                segment.length > 0 && (
                  <circle
                    key={index}
                    data-segment=""
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={THICKNESS}
                    pathLength={360}
                    strokeDasharray={`${segment.length} 360`}
                    strokeDashoffset={-segment.start}
                    className={seriesStroke[segment.series]}
                  />
                ),
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center whitespace-nowrap">
          <span aria-hidden className="font-display text-heading-h1 text-text-primary tabular-nums">
            {counted ?? 0}
          </span>
          <span aria-hidden className="text-caption-regular text-text-muted">
            {totalLabel}
          </span>
          {/* Screen readers get the final number, not the frames */}
          <span className="sr-only">
            {shownTotal} {totalLabel}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((datum, index) => (
          <ChartLegendItem
            key={`${datum.label}-${index}`}
            series={segments[index].series}
            label={datum.label}
            value={datum.value}
          />
        ))}
      </ul>
    </div>
  )
}
