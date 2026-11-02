import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const GAP = 4
const MAX_HEIGHT = 320
const VIEWPORT_MARGIN = 8

interface AnchoredPopoverOptions {
  open: boolean
  /** Called on a press outside both the anchor and the popover */
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  /** An element with `popover="manual"` */
  popoverRef: RefObject<HTMLElement | null>
  /** Match the anchor's width, never narrower than this. Omit to keep the popover's own width. */
  minWidth?: number
  /** Cap the height at 320px and let the popover scroll (menus). Off for fixed-size panels. */
  scrollable?: boolean
}

/**
 * Shows a manual popover 4px below its anchor, or above it when there's more room there, and
 * keeps it attached while the page scrolls or resizes. Sets `data-placement` (top | bottom) for
 * the motion classes in `popoverMotion`. Esc and focus handling stay with the component.
 */
export function useAnchoredPopover({
  open,
  onClose,
  anchorRef,
  popoverRef,
  minWidth,
  scrollable,
}: AnchoredPopoverOptions) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (!anchor || !popover) return
    const rect = anchor.getBoundingClientRect()
    if (minWidth !== undefined) popover.style.width = `${Math.max(rect.width, minWidth)}px`
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN
    popover.style.maxHeight = ''
    const above = popover.offsetHeight > spaceBelow && spaceAbove > spaceBelow
    if (scrollable) {
      popover.style.maxHeight = `${Math.min(MAX_HEIGHT, above ? spaceAbove : spaceBelow)}px`
    }
    const width = popover.offsetWidth
    const top = above ? rect.top - GAP - popover.offsetHeight : rect.bottom + GAP
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    )
    popover.style.top = `${top}px`
    popover.style.left = `${left}px`
    popover.dataset.placement = above ? 'top' : 'bottom'
  }, [anchorRef, popoverRef, minWidth, scrollable])

  useLayoutEffect(() => {
    const popover = popoverRef.current
    if (!popover) return
    if (open) {
      popover.showPopover()
      place()
    } else if (popover.matches(':popover-open')) {
      popover.hidePopover()
    }
  }, [open, place, popoverRef])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      onCloseRef.current()
    }
    const onScroll = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) place()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place, anchorRef, popoverRef])
}
