import { useEffect, useRef, useState } from 'react'
import { easeOut } from '../lib/easing'
import { prefersReducedMotion, readDuration } from '../lib/motion'

function decimalsOf(n: number) {
  const [, fraction = ''] = String(n).split('.')
  return fraction.length
}

/**
 * Counts from the shown number to `target` over duration/slow with ease/out whenever `target`
 * changes. The first value shows as is, and a number arriving after `null` (loading) counts up
 * from 0. In-between values keep the target's decimal places. Reduced motion jumps straight there.
 */
export function useCountUp(target: number | null): number | null {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (target === shownRef.current) return

    const show = (n: number | null) => {
      shownRef.current = n
      setShown(n)
    }

    const from = shownRef.current ?? 0
    if (target === null || prefersReducedMotion()) {
      show(target)
      return
    }

    const duration = readDuration('--duration-slow', 280)
    const factor = 10 ** decimalsOf(target)
    let start: number | undefined
    let frame = requestAnimationFrame(function step(now) {
      start ??= now
      const t = Math.min((now - start) / duration, 1)
      show(t === 1 ? target : Math.round((from + (target - from) * easeOut(t)) * factor) / factor)
      if (t < 1) frame = requestAnimationFrame(step)
    })

    return () => cancelAnimationFrame(frame)
  }, [target])

  return shown
}
