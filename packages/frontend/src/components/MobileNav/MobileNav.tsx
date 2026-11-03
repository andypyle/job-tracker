import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import { getInitials } from '../../lib/initials'
import { jobsLinks } from '../../lib/navLinks'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { Avatar } from '../Avatar/Avatar'
import { IconButton } from '../IconButton/IconButton'
import { NavItem } from '../NavItem/NavItem'
import { navItemVariants } from '../NavItem/NavItem.variants'
import type { MobileNavProps } from './MobileNav.types'

// The panel sits 8px above the trigger and keeps 16px from the top of the viewport
const GAP = 8
const EDGE = 16

const triggerClasses = 'bg-brand-default text-text-on-brand hover:bg-brand-hover'

// Items fade up 4px with a 20ms stagger from the bottom (--stagger counts up from the last
// item). Only the enter is staggered: closing fades the panel as a whole. The fade runs on
// ease/out, since a fade on the bounce curve pops. Reduced motion leaves them to the panel's fade.
const staggerItem = cn(
  // The delay is in the shorthand: a separate transition-delay can be reset by it
  'motion-safe:[transition:opacity_var(--duration-base)_var(--ease-out)_calc(var(--stagger)*20ms),translate_var(--duration-slow)_var(--ease-bounce)_calc(var(--stagger)*20ms)]',
  'motion-safe:starting:translate-y-1 motion-safe:starting:opacity-0',
)
const stagger = (fromBottom: number) => ({ '--stagger': fromBottom }) as CSSProperties

/**
 * A bottom-left trigger that opens the navigation in a panel growing from it, so everything
 * stays within one-handed reach. The panel is a modal `<dialog>`: Esc, a tap on the scrim, the
 * x and choosing a page close it, and the browser returns focus to the trigger.
 */
export function MobileNav({ counts, user, onSignOut, floating = true, className }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const jobsId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const nav = useRef<HTMLElement>(null)

  // Placed from the trigger, so the panel opens above it wherever it sits (floating or in the
  // Bottom bar). The modal page is inert, so the dialog carries its own x over the trigger.
  useLayoutEffect(() => {
    const el = dialog.current
    if (!el) return
    if (!open) {
      if (el.open) el.close()
      return
    }
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const bottom = window.innerHeight - rect.top + GAP
      el.style.left = `${rect.left}px`
      el.style.bottom = `${bottom}px`
      el.style.setProperty('--panel-max-h', `${window.innerHeight - bottom - EDGE}px`)
    }
    place()
    if (!el.open) el.showModal()
    // Start on the current page (Settings is up in the account block) rather than the first
    // focusable item; with none current, on the first page link
    ;(el.querySelector<HTMLElement>('a[aria-current=page]') ?? nav.current?.querySelector<HTMLElement>('a'))?.focus()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  // The x inside the panel mounts as the menu glyph and morphs on the next frame
  const [morphed, setMorphed] = useState(false)
  useEffect(() => {
    if (!open) {
      setMorphed(false)
      return
    }
    const frame = requestAnimationFrame(() => setMorphed(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <IconButton
        ref={trigger}
        icon="menu"
        label="Menu"
        active={open}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={cn(
          triggerClasses,
          floating && 'fixed bottom-[calc(--spacing(4)+env(safe-area-inset-bottom))] left-4 z-10 shadow-overlay',
          className,
        )}
        onClick={() => setOpen(true)}
      />

      <dialog
        ref={dialog}
        id={panelId}
        aria-label="Menu"
        className={cn(
          'group fixed inset-auto m-0 max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-text-primary',
          // Keeps the dialog (and the x) in the top layer while the panel's exit runs
          'transition-[display,overlay] transition-discrete duration-(--duration-fast) open:duration-(--duration-slow)',
          // The scrim fades in over duration/base and out over duration/fast
          'backdrop:bg-bg-scrim backdrop:backdrop-blur-backdrop',
          'backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-(--duration-fast) backdrop:ease-in',
          'open:backdrop:opacity-100 open:backdrop:duration-(--duration-base) open:backdrop:ease-out',
          'starting:open:backdrop:opacity-0',
        )}
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        // A tap on the scrim lands on the dialog element itself, outside the panel
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div
          className={cn(
            'flex max-h-(--panel-max-h) w-70 flex-col gap-2 overflow-y-auto rounded-sm border border-border-divider bg-bg-overlay p-2 shadow-overlay',
            // Grows from the trigger's corner: scale 0.92 to 1 on ease/spring over duration/slower
            // (Figma: ease/bounce over duration/slow, whose overshoot is invisible over so short a
            // move), fading over duration/base; closes over duration/fast with ease/in. Reduced
            // motion: fade only.
            'origin-bottom-left [--panel-scale:0.92] motion-reduce:[--panel-scale:1]',
            'scale-(--panel-scale) opacity-0 [transition:opacity_var(--duration-fast)_var(--ease-in),scale_var(--duration-fast)_var(--ease-in)]',
            'group-open:scale-100 group-open:opacity-100',
            'group-open:[transition:opacity_var(--duration-base)_var(--ease-out),scale_var(--duration-slower)_var(--ease-spring)]',
            'starting:group-open:scale-(--panel-scale) starting:group-open:opacity-0',
          )}
        >
          {/* Account first, farthest from the thumb: it's used least */}
          <div className="flex flex-col gap-1 px-2 pt-2">
            <div className={cn('flex items-center gap-3 px-1 py-2', staggerItem)} style={stagger(7)}>
              {/* Decorative: the name is next to it */}
              <Avatar size="md" initials={getInitials(user.name)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label-base text-text-primary">{user.name}</span>
                {user.email && <span className="truncate text-caption-regular text-text-muted">{user.email}</span>}
              </div>
            </div>
            <div className={staggerItem} style={stagger(6)}>
              <NavItem to="/settings" icon="settings" onClick={close}>
                Settings
              </NavItem>
            </div>
            <AnimatedIcon<HTMLButtonElement>
              name="log-out"
              size={20}
              className="text-text-muted"
              onClick={() => {
                close()
                onSignOut()
              }}
              render={(handlers, iconNode) => (
                <button
                  type="button"
                  className={cn(navItemVariants(), 'w-full cursor-pointer text-left', staggerItem)}
                  style={stagger(5)}
                  {...handlers}
                >
                  {iconNode}
                  <span className="flex-1">Sign out</span>
                </button>
              )}
            />
          </div>

          <div aria-hidden="true" className="h-px shrink-0 bg-border-divider" />

          <nav ref={nav} aria-label="Main" className="px-3 py-4">
            <ul className="flex flex-col gap-1">
              <li className={staggerItem} style={stagger(4)}>
                <NavItem to="/" end icon="dashboard" onClick={close}>
                  Dashboard
                </NavItem>
              </li>
              <li className="flex flex-col gap-1 pt-3">
                <span id={jobsId} className={cn('px-3 pb-1 text-caption-medium text-text-muted', staggerItem)} style={stagger(3)}>
                  Jobs
                </span>
                <ul aria-labelledby={jobsId} className="flex flex-col gap-1">
                  {jobsLinks.map(({ to, icon, label, group }, index) => (
                    <li key={to} className={staggerItem} style={stagger(jobsLinks.length - 1 - index)}>
                      {/* 48px with or without a count, so nothing shifts when counts load */}
                      <NavItem level="sub" to={to} icon={icon} count={counts?.[group]} className="min-h-12" onClick={close}>
                        {label}
                      </NavItem>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>

        {/* Over the trigger, which is inert under the scrim: shows the x and closes the panel */}
        <IconButton
          icon="menu"
          label="Close menu"
          active={morphed}
          className={cn(triggerClasses, 'absolute top-[calc(100%+8px)] left-0', floating && 'shadow-overlay')}
          onClick={close}
        />
      </dialog>
    </>
  )
}
