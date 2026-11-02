import { useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../components/AppShell/AppShell'
import { ApplicationModal } from '../components/ApplicationModal'
import { useApplicationCounts } from '../hooks/useApplicationCounts'
import { useAuth } from '../hooks/useAuth'
import { getDisplayName } from '../lib/userName'

interface AppLayoutContext {
  /** Opens the Add application dialog, which the layout owns */
  openAddApplication: () => void
}

/** For pages inside the layout, e.g. a PageHeader's "Add application" action */
export function useAddApplication() {
  return useOutletContext<AppLayoutContext>().openAddApplication
}

/**
 * The signed-in route element: AppShell wired to auth and the counts. Application detail has no
 * Bottom bar (the MobileNav trigger floats); every other page has one.
 */
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoading, ...counts } = useApplicationCounts()
  const onDetail = useMatch('/jobs/detail/:id') !== null
  const [adding, setAdding] = useState(false)
  const openAddApplication = () => setAdding(true)

  return (
    <AppShell
      counts={isLoading ? undefined : counts}
      user={{ name: getDisplayName(user), email: user?.email }}
      onSignOut={async () => {
        await signOut()
        navigate('/login')
      }}
      onAddApplication={onDetail ? undefined : openAddApplication}
    >
      <Outlet context={{ openAddApplication } satisfies AppLayoutContext} />
      {/* The old modal until the Add application dialog is rebuilt */}
      <ApplicationModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        onSuccess={() => {
          setAdding(false)
          queryClient.invalidateQueries({ queryKey: ['applications'] })
        }}
      />
    </AppShell>
  )
}
