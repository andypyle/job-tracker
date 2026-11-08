import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Spinner } from './components/Spinner/Spinner'
import { AppLayout } from './pages/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ActiveJobsPage } from './pages/ActiveJobsPage'
import { UnlikelyJobsPage } from './pages/UnlikelyJobsPage'
import { RejectedJobsPage } from './pages/RejectedJobsPage'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { SettingsPage } from './pages/SettingsPage'

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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

          <Route path="/jobs/active" element={<ActiveJobsPage />} />
          <Route path="/jobs/unlikely" element={<UnlikelyJobsPage />} />
          <Route path="/jobs/rejected" element={<RejectedJobsPage />} />

          {/* Application detail */}
          <Route path="/jobs/detail/:id" element={<ApplicationDetailPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all — redirect unknown paths to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
