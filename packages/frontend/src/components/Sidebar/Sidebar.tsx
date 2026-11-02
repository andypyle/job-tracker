import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { getInitials } from '../../lib/initials'
import { jobsLinks } from '../../lib/navLinks'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { Avatar } from '../Avatar/Avatar'
import { Icon } from '../Icon/Icon'
import { NavItem } from '../NavItem/NavItem'
import { navItemVariants } from '../NavItem/NavItem.variants'
import type { SidebarProps } from './Sidebar.types'

// The Sidebar draws the active marker (bg/nav-active and the 3px brand rail) as one piece and
// slides it between items, so the items paint neither. Their rail border stays transparent all
// the time: if it only turned transparent when current, NavItem's color transition would fade it
// from pine and flash a second rail. The aria- copy matches NavItem's current-state selector, which
// would otherwise outrank the plain class. The current item still takes text/nav-active.
const sidebarItem =
  'border-l-transparent aria-[current=page]:border-l-transparent aria-[current=page]:bg-transparent'

interface Marker {
  top: number
  height: number
}

/**
 * 240px: the brand, Dashboard, the Jobs links with counts, and the account block with
 * Sign out. When the route changes, the active marker slides to the new item.
 */
export function Sidebar({ counts, user, onSignOut, className, ...props }: SidebarProps) {
  const jobsId = useId()
  const nav = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // Measured from the link NavLink marks aria-current, within the nav's scrolling box; kept while
  // no link is current (a detail page) so it fades out in place and slides from there next time
  const [marker, setMarker] = useState<Marker | null>(null)
  const [visible, setVisible] = useState(false)
  useLayoutEffect(() => {
    const el = nav.current
    if (!el) return
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[aria-current=page]')
      setVisible(Boolean(active))
      if (!active) return
      const top = active.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
      setMarker({ top, height: active.offsetHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pathname])

  // The first position is placed, not animated
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    if (!marker || animated) return
    const frame = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(frame)
  }, [marker, animated])

  return (
    <aside
      className={cn('flex h-full w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-surface', className)}
      {...props}
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border-subtle px-6 py-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-brand-default text-text-on-brand">
          <Icon name="briefcase" size={16} />
        </span>
        {/* Figma sets the name in Gabarito 20 on a 24px line */}
        <span className="font-display text-heading-h3 leading-6 text-text-primary">Job Tracker</span>
      </div>

      <nav ref={nav} aria-label="Main" className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {/* Before the list, which is positioned too, so the links paint above it */}
        {marker && (
          <span
            aria-hidden="true"
            data-sidebar-marker=""
            className={cn(
              'pointer-events-none absolute inset-x-3 top-0 rounded-sm border-l-3 border-brand-default bg-bg-nav-active',
              'transition-opacity duration-(--duration-fast) ease-out',
              // Slides with ease/bounce over duration/slow (Figma says base, which felt rushed);
              // reduced motion jumps
              animated &&
                'motion-safe:transition-[translate,height,opacity] motion-safe:duration-(--duration-slow) motion-safe:ease-bounce',
              !visible && 'opacity-0',
            )}
            style={{ translate: `0 ${marker.top}px`, height: marker.height }}
          />
        )}
        <ul className="relative flex flex-col gap-1">
          <li>
            <NavItem to="/" end icon="dashboard" className={sidebarItem}>
              Dashboard
            </NavItem>
          </li>
          <li className="flex flex-col gap-1 pt-3">
            <span id={jobsId} className="px-3 pb-1 text-caption-medium text-text-muted">
              Jobs
            </span>
            {/* Sub items keep 48px with or without a count, so nothing shifts when counts load */}
            <ul aria-labelledby={jobsId} className="flex flex-col gap-1">
              {jobsLinks.map(({ to, icon, label, group }) => (
                <li key={to}>
                  <NavItem level="sub" to={to} icon={icon} count={counts?.[group]} className={cn('min-h-12', sidebarItem)}>
                    {label}
                  </NavItem>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      <div className="flex shrink-0 flex-col gap-1 border-t border-border-subtle px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2">
          {/* Decorative: the name is next to it */}
          <Avatar size="md" initials={getInitials(user.name)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-label-base text-text-primary">{user.name}</span>
            {user.email && <span className="truncate text-caption-regular text-text-muted">{user.email}</span>}
          </div>
        </div>
        <AnimatedIcon<HTMLButtonElement>
          name="log-out"
          size={20}
          className="text-text-muted"
          onClick={onSignOut}
          render={(handlers, iconNode) => (
            <button type="button" className={cn(navItemVariants(), 'w-full cursor-pointer text-left')} {...handlers}>
              {iconNode}
              <span className="flex-1">Sign out</span>
            </button>
          )}
        />
      </div>
    </aside>
  )
}
