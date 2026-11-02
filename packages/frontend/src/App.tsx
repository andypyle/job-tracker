import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Spinner } from './components/Spinner/Spinner'
import { AppLayout } from './pages/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { JobsPage } from './pages/JobsPage'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'

// ---------------------------------------------------------------------------
// Full-screen loading state shown while the auth session is being resolved
// ---------------------------------------------------------------------------
function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-canvas text-text-muted">
      <Spinner size="md" label="Loading" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Protected route wrapper — redirects to /login when unauthenticated
// ---------------------------------------------------------------------------
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes, inside the app shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          {/* /jobs → redirect to /jobs/active */}
          <Route path="/jobs" element={<Navigate to="/jobs/active" replace />} />

          {/* /jobs/:status — e.g. /jobs/active, /jobs/rejected, /jobs/applied, /jobs/all */}
          <Route path="/jobs/:status" element={<JobsPage />} />

          {/* Application detail */}
          <Route path="/jobs/detail/:id" element={<ApplicationDetailPage />} />
        </Route>

        {/* Catch-all — redirect unknown paths to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
