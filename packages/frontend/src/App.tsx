import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}
      aria-label="Loading"
    >
      <svg
        className="animate-spin w-8 h-8"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          style={{ color: 'var(--color-border)' }}
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          style={{ color: 'var(--color-primary)' }}
        />
      </svg>
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

        {/* Protected routes — wrapped in Layout (sidebar shell) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          {/* /jobs → redirect to /jobs/all */}
          <Route path="/jobs" element={<Navigate to="/jobs/all" replace />} />

          {/* /jobs/:status — e.g. /jobs/applied, /jobs/all */}
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
