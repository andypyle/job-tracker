import { cn } from '../../lib/cn'
import type { SpinnerProps } from './Spinner.types'
import { spinnerVariants } from './Spinner.variants'

// Track and arc paths from the Figma Spinner component (2px stroke, arc covers 30% of the circle)
const paths = {
  sm: {
    box: 16,
    track:
      'M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z',
    arc: 'M8 1C9.10467 1 10.1937 1.26144 11.1779 1.76295C12.1622 2.26447 13.0138 2.9918 13.6631 3.8855C14.3124 4.7792 14.741 5.81389 14.9138 6.90496C15.0866 7.99603 14.9988 9.11251 14.6574 10.1631',
  },
  md: {
    box: 20,
    track:
      'M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z',
    arc: 'M10 1C11.4203 1 12.8204 1.33614 14.0859 1.98094C15.3514 2.62574 16.4463 3.56089 17.2812 4.70993C18.116 5.85897 18.667 7.18928 18.8892 8.59209C19.1114 9.9949 18.9984 11.4304 18.5595 12.7812',
  },
}

export function Spinner({ className, size, label = 'Loading', ...props }: SpinnerProps) {
  const { box, track, arc } = paths[size ?? 'sm']
  return (
    <span role="status" className={cn(spinnerVariants({ size }), className)} {...props}>
      <svg
        viewBox={`0 0 ${box} ${box}`}
        width={box}
        height={box}
        fill="none"
        strokeWidth={2}
        aria-hidden="true"
        focusable="false"
      >
        <path d={track} className="stroke-border-default" />
        <path d={arc} strokeLinecap="round" className="stroke-text-muted" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
