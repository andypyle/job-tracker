import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useApplicationCounts } from '../hooks/useApplicationCounts'

// SVG icon components — no emojis, consistent 24x24 viewBox
function IconLayoutDashboard() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function IconBan() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function IconLogOut() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconXClose() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Count badge shown next to Jobs sub-links
// ---------------------------------------------------------------------------
interface CountBadgeProps {
  count: number
  isLoading: boolean
}

function CountBadge({ count, isLoading }: CountBadgeProps) {
  return (
    <span
      className="ml-auto text-xs font-medium tabular-nums px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 min-w-[1.5rem] text-center"
      aria-label={isLoading ? 'loading count' : `${count} applications`}
    >
      {isLoading ? '—' : count}
    </span>
  )
}

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { active, rejected, isLoading: countsLoading } = useApplicationCounts()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer',
      isActive
        ? 'bg-teal-50 text-teal-700'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
    ].join(' ')

  // Sub-link class for the indented Jobs children — slightly smaller, indented
  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer',
      isActive
        ? 'bg-teal-50 text-teal-700'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
    ].join(' ')

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* App name / logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <span
            className="font-semibold text-base"
            style={{ color: 'var(--color-text)' }}
          >
            Job Tracker
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={navLinkClass}
          onClick={closeSidebar}
        >
          <IconLayoutDashboard />
          Dashboard
        </NavLink>

        {/* Jobs section — non-clickable category label + two sub-links */}
        <div className="pt-3">
          <p
            className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
            aria-hidden="true"
          >
            Jobs
          </p>

          {/* Active sub-link */}
          <NavLink
            to="/jobs/active"
            className={subNavLinkClass}
            onClick={closeSidebar}
          >
            <IconBriefcase />
            <span>Active</span>
            <CountBadge count={active} isLoading={countsLoading} />
          </NavLink>

          {/* Rejected sub-link */}
          <NavLink
            to="/jobs/rejected"
            className={subNavLinkClass}
            onClick={closeSidebar}
          >
            <IconBan />
            <span>Rejected</span>
            <CountBadge count={rejected} isLoading={countsLoading} />
          </NavLink>
        </div>
      </nav>

      {/* User info + sign out */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', opacity: 0.15 }}
            aria-hidden="true"
          />
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 -ml-9"
            style={{ color: 'var(--color-primary)' }}
          >
            <IconUser />
          </div>
          <p
            className="text-xs font-medium truncate max-w-[140px]"
            style={{ color: 'var(--color-text-muted)' }}
            title={user?.email ?? ''}
          >
            {user?.email ?? ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 cursor-pointer"
        >
          <IconLogOut />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-100 z-40 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          'md:translate-x-0 md:static md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ boxShadow: 'var(--shadow-sm)' }}
        aria-label="Sidebar"
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-600 md:hidden cursor-pointer"
          aria-label="Close sidebar"
        >
          <IconXClose />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-700 cursor-pointer"
            aria-label="Open sidebar"
          >
            <IconMenu />
          </button>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            Job Tracker
          </span>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
