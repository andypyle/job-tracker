import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { AuthLayoutProps } from './AuthLayout.types'

/**
 * The Login and Sign up frame: the pine brand panel beside the form from lg, above it below.
 * The panel renders in Dark mode, like the other pine bands.
 */
export function AuthLayout({ children, className, ...props }: AuthLayoutProps) {
  return (
    <div className={cn('flex min-h-dvh flex-col bg-bg-canvas lg:flex-row', className)} {...props}>
      <header
        className={cn(
          'flex flex-col gap-8 bg-bg-band px-5 pt-5 pb-8 text-text-on-band [color-scheme:dark]',
          'lg:w-1/2 lg:max-w-160 lg:shrink-0 lg:justify-between lg:gap-12 lg:px-16 lg:py-14',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-brand-default text-text-on-brand">
            <Icon name="briefcase" size={20} />
          </span>
          {/* Figma sets the name in Gabarito 22; no text style matches */}
          <span className="font-display text-[1.375rem] leading-7 font-bold">Job Tracker</span>
        </div>

        <div className="flex flex-col gap-2 lg:gap-5">
          <p className="font-display text-heading-h1 lg:max-w-125 lg:text-display-hero">
            Know where every application stands.
          </p>
          <p className="text-body-base text-text-on-band-muted lg:max-w-110 lg:text-body-large">
            Applications, interviews and offers, tracked without a spreadsheet.
          </p>
        </div>

        <p className="hidden text-caption-regular text-text-on-band-muted lg:block">
          © {new Date().getFullYear()} Job Tracker
        </p>
      </header>

      <main className="flex flex-1 flex-col px-5 pt-8 pb-10 lg:items-center lg:justify-center lg:p-10">
        <div className="w-full max-w-100">{children}</div>
      </main>
    </div>
  )
}
