import { cn } from '../../lib/cn'
import type { MobileTopBarProps } from './MobileTopBar.types'

/** Brand-only header below md. Navigation lives in MobileNav, within thumb reach. */
export function MobileTopBar({ className, ...props }: MobileTopBarProps) {
  return (
    <header
      className={cn(
        'flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3',
        className,
      )}
      {...props}
    >
      {/* Figma sets the name in Gabarito 18 on a 24px line; no text style matches */}
      <span className="font-display text-[1.125rem] leading-6 font-bold text-text-primary">Job Tracker</span>
    </header>
  )
}
