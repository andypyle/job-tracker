import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { focusRing } from '../../lib/classes'
import type { BarChartProps } from './BarChart.types'

// The tallest bar fills 90% of the 160px plot (144px in Figma), leaving room for its value
const PEAK = 0.9

/**
 * Bars in chart/single with radius-xs tops, on four chart/grid lines, x labels in Caption below.
 * The plot is one tab stop: arrow keys, Home and End move between bars (roving tabindex), and a
 * hovered or focused bar shows its value above it. Bars grow from the baseline on mount,
 * staggered 30ms left to right; reduced motion skips it.
 */
export function BarChart({ className, data, label, formatValue = String, ...props }: BarChartProps) {
  const max = Math.max(0, ...data.map((d) => d.value))
  const [active, setActive] = useState(0)
  const bars = useRef<(HTMLDivElement | null)[]>([])
  const current = Math.min(active, data.length - 1)

  const onKeyDown = (event: KeyboardEvent) => {
    const last = data.length - 1
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const index = Math.max(0, Math.min(next, last))
    setActive(index)
    bars.current[index]?.focus()
  }

  return (
    <div className={cn('@container flex flex-col gap-2', className)} {...props}>
      <div role="group" aria-label={label} className="relative flex h-40 items-end" onKeyDown={onKeyDown}>
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-px bg-chart-grid" />
          ))}
        </div>
        {data.map((datum, index) => {
          const height = `${max ? (datum.value / max) * PEAK * 100 : 0}%`
          return (
            <div
              key={`${datum.label}-${index}`}
              ref={(el) => {
                bars.current[index] = el
              }}
              role="img"
              aria-label={`${datum.label}: ${formatValue(datum.value)}`}
              tabIndex={index === current ? 0 : -1}
              onFocus={() => setActive(index)}
              className={cn('group/bar relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-xs', focusRing)}
            >
              <span
                aria-hidden
                style={{ bottom: `calc(${height} + 4px)` }}
                className="pointer-events-none absolute text-caption-medium whitespace-nowrap text-text-primary opacity-0 transition-opacity duration-(--duration-fast) ease-out group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100"
              >
                {formatValue(datum.value)}
              </span>
              <div
                data-bar=""
                style={{ height, animationDelay: `${index * 30}ms` }}
                className="relative w-full max-w-7 origin-bottom rounded-t-xs bg-chart-single motion-safe:animate-grow-up motion-safe:transition-[height] motion-safe:duration-(--duration-slow) motion-safe:ease-bounce"
              />
            </div>
          )
        })}
      </div>
      {/* Every other label below 360px, so they don't collide */}
      <div aria-hidden className="flex">
        {data.map((datum, index) => (
          <span
            key={`${datum.label}-${index}`}
            className="min-w-0 flex-1 text-center text-caption-regular whitespace-nowrap text-text-muted @max-[22.5rem]:even:invisible"
          >
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  )
}
