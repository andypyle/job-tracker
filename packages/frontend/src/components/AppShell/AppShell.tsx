import { focusRing } from '../../lib/classes'
import { cn } from '../../lib/cn'
import { Button } from '../Button/Button'
import { MobileNav } from '../MobileNav/MobileNav'
import { MobileTopBar } from '../MobileTopBar/MobileTopBar'
import { Sidebar } from '../Sidebar/Sidebar'
import { Toaster } from '../Toaster/Toaster'
import type { AppShellProps } from './AppShell.types'

// The Bottom bar is Figma's 84px: its 1px top border and 11px, the 44px row, then 28px below (or
// the safe area, if that's more). The page is padded by the same amount so its end clears the bar.
const bottomBarPadding = 'pb-[max(--spacing(7),env(safe-area-inset-bottom))]'
const bottomBarClearance = 'max-md:pb-[calc(--spacing(14)+max(--spacing(7),env(safe-area-inset-bottom)))]'

// Below md, toasts sit 16px above whatever holds the bottom edge: the Bottom bar, or the
// floating MobileNav trigger (16px + 44px + the safe area)
const toastsAboveBar = 'max-md:bottom-[calc(--spacing(18)+max(--spacing(7),env(safe-area-inset-bottom)))]'
const toastsAboveTrigger = 'max-md:bottom-[calc(--spacing(19)+env(safe-area-inset-bottom))]'

/**
 * The page scrolls as a whole: the Sidebar stays put beside it from md, and the Bottom bar is
 * fixed to the bottom below md. Also renders the one Toaster.
 */
export function AppShell({ counts, user, onSignOut, onAddApplication, children, className }: AppShellProps) {
  const bottomBar = Boolean(onAddApplication)

  return (
    <div className={cn('flex min-h-dvh bg-bg-canvas', className)}>
      {/* Focuses the page itself rather than following the hash, so the URL stays as it is */}
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className={cn(
          'sr-only rounded-sm bg-bg-surface px-4 py-3 text-label-base text-text-primary shadow-overlay',
          'focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50',
          focusRing,
        )}
      >
        Skip to content
      </a>

      <Sidebar
        counts={counts}
        user={user}
        onSignOut={onSignOut}
        className="sticky top-0 hidden h-dvh md:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar className="md:hidden" />
        {/* tabIndex lets the skip link focus it */}
        <main id="main" tabIndex={-1} className={cn('flex flex-1 flex-col outline-none', bottomBar && bottomBarClearance)}>
          {children}
        </main>
      </div>

      {bottomBar ? (
        <div
          data-bottom-bar=""
          className={cn(
            'fixed inset-x-0 bottom-0 z-10 flex items-start gap-3 border-t border-border-subtle bg-bg-surface px-4 pt-[calc(--spacing(3)-1px)] md:hidden',
            bottomBarPadding,
          )}
        >
          <MobileNav counts={counts} user={user} onSignOut={onSignOut} floating={false} />
          <Button variant="primary" icon="plus" className="flex-1" onClick={onAddApplication}>
            Add application
          </Button>
        </div>
      ) : (
        <MobileNav counts={counts} user={user} onSignOut={onSignOut} className="md:hidden" />
      )}

      <Toaster className={bottomBar ? toastsAboveBar : toastsAboveTrigger} />
    </div>
  )
}
