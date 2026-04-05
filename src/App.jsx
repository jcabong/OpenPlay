import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'

import Layout             from './components/Layout'
import LoadingScreen      from './components/LoadingScreen'
import UsernameSetup      from './components/UsernameSetup'
import LoginPage          from './pages/LoginPage'
import AuthCallback       from './pages/AuthCallback'
import FeedPage           from './pages/FeedPage'
import LogGamePage        from './pages/LogGamePage'
import LeaderboardPage    from './pages/LeaderboardPage'
import EventsPage         from './pages/EventsPage'
import ProfilePage        from './pages/ProfilePage'
import PublicProfilePage  from './pages/PublicProfilePage'
import AdminPage          from './pages/AdminPage'

function ProtectedRoutes() {
  const { user, profile, loading } = useAuth()
  const [checking, setChecking] = useState(true)

  // ── Use profile.username from AuthContext instead of making a 2nd DB call ──
  // The old code called supabase directly here, causing a duplicate fetch race.
  useEffect(() => {
    if (!loading) setChecking(false)
  }, [loading])

  if (loading || checking) return <LoadingScreen />
  if (!user)               return <Navigate to="/login" replace />

  if (!profile?.username) {
    return (
      <UsernameSetup
        user={user}
        onComplete={() => {}}  // AuthContext will auto-refresh via refreshProfile
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<FeedPage />} />
        <Route path="/log"            element={<LogGamePage />} />
        <Route path="/ranks"          element={<LeaderboardPage />} />
        <Route path="/events"         element={<EventsPage />} />
        <Route path="/profile"        element={<ProfilePage />} />
        <Route path="/admin"          element={<AdminPage />} />
        <Route path="/user/:username" element={<PublicProfilePage />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function PublicRoutes() {
  const { user, loading } = useAuth()

  // ── While auth is still initialising, show loading so we don't flash login ─
  // This was the desktop bug: loading:true meant the route rendered immediately
  // as a blank screen because LoginPage itself had no awareness of auth state.
  if (loading) return <LoadingScreen />

  // If already logged in, skip login page and go straight to app
  if (user) return <Navigate to="/" replace />

  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login is now inside AuthProvider so it can read loading/user state */}
          <Route path="/login"         element={<PublicRoutes />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*"             element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
