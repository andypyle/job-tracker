import { useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { AppShell } from '../components/AppShell/AppShell'
import { ApplicationDialog } from '../components/ApplicationDialog/ApplicationDialog'
import { useApplicationCounts } from '../hooks/useApplicationCounts'
import { useAuth } from '../hooks/useAuth'
import { useSaveApplication } from '../hooks/useSaveApplication'
import { isDemoUser } from '../lib/demo'
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
 * The signed-in route element: AppShell wired to auth and the counts. Application detail and
 * Settings have no Bottom bar (the MobileNav trigger floats); every other page has one.
 */
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const saveApplication = useSaveApplication()
  const { isLoading, ...counts } = useApplicationCounts()
  const onDetail = useMatch('/jobs/detail/:id') !== null
  const onSettings = useMatch('/settings') !== null
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
      onAddApplication={onDetail || onSettings ? undefined : openAddApplication}
    >
      <Outlet context={{ openAddApplication } satisfies AppLayoutContext} />
      <ApplicationDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={async (values) => {
          await saveApplication(values)
          setAdding(false)
        }}
        allowUploads={!isDemoUser(user)}
      />
    </AppShell>
  )
}
