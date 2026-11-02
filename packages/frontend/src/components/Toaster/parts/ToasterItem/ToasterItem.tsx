import { useEffect, useRef, type PointerEvent } from 'react'
import { dismissToast } from '../../../../lib/toast'
import { mergeRefs } from '../../../../lib/mergeRefs'
import { prefersReducedMotion, readDuration, readEasing } from '../../../../lib/motion'
import { Button } from '../../../Button/Button'
import { Toast } from '../../../Toast/Toast'
import type { ToasterItemProps } from './ToasterItem.types'

// A swipe this far down or right dismisses; less springs back
const SWIPE_DISMISS = { x: 64, y: 32 }
// Movement before a touch counts as a swipe rather than a tap
const SWIPE_START = 8

/**
 * One toast in the stack: its timer, which holds while the stack is hovered or focused and keeps
 * the time left, and swipe to dismiss for touch and pen.
 */
export function ToasterItem({ record, paused, itemRef }: ToasterItemProps) {
  const { id, tone, title, message, action, duration, dismissible = true, leaving } = record
  const element = useRef<HTMLDivElement>(null)
  const remaining = useRef(duration)
  const drag = useRef<{ x: number; y: number; dx: number; dy: number; swiping: boolean } | null>(null)

  useEffect(() => {
    if (paused || leaving || !Number.isFinite(remaining.current)) return
    const start = performance.now()
    const timer = window.setTimeout(() => dismissToast(id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= performance.now() - start
    }
  }, [paused, leaving, id])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || leaving) return
    drag.current = { x: event.clientX, y: event.clientY, dx: 0, dy: 0, swiping: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    d.dx = Math.max(0, event.clientX - d.x)
    d.dy = Math.max(0, event.clientY - d.y)
    if (!d.swiping && Math.max(d.dx, d.dy) > SWIPE_START) {
      // Capture only once it's a swipe, so a tap still clicks the buttons inside
      d.swiping = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (d.swiping) event.currentTarget.style.transform = `translate(${d.dx}px, ${d.dy}px)`
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d?.swiping) return
    if (d.dx > SWIPE_DISMISS.x || d.dy > SWIPE_DISMISS.y) {
      // The exit plays on top of where the swipe left it
      dismissToast(id)
      return
    }
    const el = event.currentTarget
    const from = el.style.transform
    el.style.transform = ''
    if (!prefersReducedMotion()) {
      el.animate([{ transform: from }, { transform: 'none' }], {
        duration: readDuration('--duration-base', 200),
        easing: readEasing('--ease-bounce', 'cubic-bezier(0.34, 1.36, 0.64, 1)'),
      })
    }
  }

  return (
    <Toast
      ref={mergeRefs(element, itemRef)}
      tone={tone}
      title={title}
      message={message}
      className="pointer-events-auto touch-none"
      action={
        action && (
          <Button
            variant="ghost"
            onClick={() => {
              action.onClick()
              dismissToast(id)
            }}
          >
            {action.label}
          </Button>
        )
      }
      onDismiss={dismissible ? () => dismissToast(id) : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    />
  )
}
