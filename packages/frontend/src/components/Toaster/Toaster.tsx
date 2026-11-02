import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '../../lib/cn'
import { prefersReducedMotion, readDuration, readEasing } from '../../lib/motion'
import { getToasts, removeToast, subscribeToasts } from '../../lib/toast'
import type { ToasterProps } from './Toaster.types'
import { ToasterItem } from './parts/ToasterItem/ToasterItem'

/**
 * The toast stack: bottom-right (24px in) from md, along the bottom with 16px insets and above
 * the safe area below md. Newest at the bottom, pushing older ones up. A `region` landmark
 * named "Notifications"; it never moves focus.
 *
 * Motion runs on the Web Animations API with the tokens' timing. It's gentler than Figma's notes
 * (280ms in, 120ms out), which felt abrupt:
 * - enter: up 16px from 0.98 scale over duration/slower with ease/bounce, and a separate fade
 *   over duration/base with ease/out, so it eases in rather than popping
 * - reflow: FLIP every sibling over duration/slower with ease/bounce, so nothing jumps
 * - exit: right 24px with a fade over duration/base, ease/in; then siblings FLIP into the gap
 * - reduced motion: opacity only, 120ms, no reflow
 */
export function Toaster({ className, ...props }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const section = useRef<HTMLElement>(null)
  const elements = useRef(new Map<string, HTMLDivElement>())
  const tops = useRef(new Map<string, number>())
  const exiting = useRef(new Set<string>())

  const register = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) elements.current.set(id, el)
      else elements.current.delete(id)
    },
    [],
  )

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion()
    const slower = readDuration('--duration-slower', 400)
    const base = readDuration('--duration-base', 200)
    const bounce = readEasing('--ease-bounce', 'cubic-bezier(0.34, 1.36, 0.64, 1)')
    const easeIn = readEasing('--ease-in', 'cubic-bezier(0.4, 0, 1, 1)')
    const easeOut = readEasing('--ease-out', 'cubic-bezier(0.2, 0.8, 0.2, 1)')
    const nextTops = new Map<string, number>()
    // Layout positions, without the running animations: getBoundingClientRect would include an
    // in-flight FLIP or bounce, and restart it as a "move". The section is the offsetParent.
    const sectionTop = section.current?.getBoundingClientRect().top ?? 0

    for (const { id, leaving } of toasts) {
      const el = elements.current.get(id)
      if (!el) continue
      const top = sectionTop + el.offsetTop
      nextTops.set(id, top)
      const previous = tops.current.get(id)

      if (leaving && !exiting.current.has(id)) {
        exiting.current.add(id)
        const exit = el.animate(reduced ? [{ opacity: 0 }] : [{ opacity: 0, translate: '24px 0' }], {
          duration: reduced ? 120 : base,
          easing: reduced ? 'linear' : easeIn,
          fill: 'forwards',
        })
        exit.finished.then(
          () => removeToast(id),
          () => {}, // cancelled: it unmounted first
        )
      }

      if (previous === undefined) {
        if (leaving) continue
        if (reduced) {
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
        } else {
          // Movement and fade run separately: the bounce curve covers most of its distance in
          // the first frames, so a fade tied to it pops in. Both wait duration/fast: the older
          // toasts start their FLIP in the slot this one takes, and fading in over them while
          // they're still there reads as a flash. `backwards` keeps it hidden while it waits.
          const delay = readDuration('--duration-fast', 120)
          el.animate(
            [
              { translate: '0 16px', scale: 0.98 },
              { translate: '0 0', scale: 1 },
            ],
            { duration: slower, delay, easing: bounce, fill: 'backwards' },
          )
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: base, delay, easing: easeOut, fill: 'backwards' })
        }
      } else if (!reduced && previous !== top) {
        // FLIP: it has already moved; start it where it was and play to where it is. Leaving
        // toasts too: when a 4th pushes the oldest out, the oldest rises with the others while
        // it exits (the added translate stacks on the exit's), rather than jumping up first.
        el.animate([{ translate: `0 ${previous - top}px` }, { translate: '0 0' }], {
          duration: slower,
          easing: bounce,
          composite: 'add',
        })
      }
    }

    tops.current = nextTops
    for (const id of exiting.current) if (!nextTops.has(id)) exiting.current.delete(id)
  }, [toasts])

  const paused = hovered || focused

  return (
    <section
      ref={section}
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed inset-x-4 bottom-[calc(--spacing(4)+env(safe-area-inset-bottom))] z-50',
        'md:inset-x-auto md:right-6 md:bottom-6 md:w-100',
        className,
      )}
      {...props}
    >
      <div
        className="flex flex-col gap-2"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
      >
        {toasts.map((record) => (
          <ToasterItem key={record.id} record={record} paused={paused} itemRef={register(record.id)} />
        ))}
      </div>
    </section>
  )
}
