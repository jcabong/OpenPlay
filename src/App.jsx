import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

import Layout            from './components/Layout'
import LoadingScreen     from './components/LoadingScreen'
import UsernameSetup     from './components/UsernameSetup'
import LoginPage         from './pages/LoginPage'
import AuthCallback      from './pages/AuthCallback'
import FeedPage          from './pages/FeedPage'
import LogGamePage       from './pages/LogGamePage'
import LeaderboardPage   from './pages/LeaderboardPage'
import EventsPage        from './pages/EventsPage'
import ProfilePage       from './pages/ProfilePage'
import PublicProfilePage from './pages/PublicProfilePage'
import AdminPage         from './pages/AdminPage'

function ProtectedRoutes() {
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth()

  // Still initialising auth
  if (loading) return <LoadingScreen />

  // Auth done but no user — go to login
  if (!user) return <Navigate to="/login" replace />

  // User exists but profile fetch is still in progress — wait for it
  // This prevents UsernameSetup flashing for existing users on page refresh
  if (profileLoading) return <LoadingScreen />

  // Profile fetch done — username missing or empty means genuinely new user
  if (!profile?.username || profile.username.trim() === '') {
    return (
      <UsernameSetup
        user={user}
        onComplete={refreshProfile}
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

  if (loading) return <LoadingScreen />
  if (user)    return <Navigate to="/" replace />

  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<PublicRoutes />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*"             element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
