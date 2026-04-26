import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import LogGamePage from './pages/LogGamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import EventsPage from './pages/EventsPage'
import ProfilePage from './pages/ProfilePage'
import PublicProfilePage from './pages/PublicProfilePage'
import AdminPage from './pages/AdminPage'
import ViralFeedPage from './pages/ViralFeedPage'
import LoadingScreen from './components/LoadingScreen'
import UsernameSetup from './components/UsernameSetup'
import AuthCallback from './pages/AuthCallback'
import ErrorBoundary from './components/ErrorBoundary'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const [hasUsername, setHasUsername] = useState(true)
  const [checking, setChecking]       = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setChecking(false)
      return
    }

    async function checkUsername() {
      setChecking(true)
      try {
        const { data } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        setHasUsername(!!data?.username)
      } catch (err) {
        console.error('Profile check failed', err)
        setHasUsername(false)
      } finally {
        setChecking(false)
      }
    }
    checkUsername()
  }, [user, loading])

  if (loading || checking) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  if (!hasUsername) {
    return <UsernameSetup user={user} onComplete={() => setHasUsername(true)} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"                element={<ErrorBoundary><FeedPage /></ErrorBoundary>} />
        <Route path="/log"             element={<ErrorBoundary><LogGamePage /></ErrorBoundary>} />
        <Route path="/ranks"           element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
        <Route path="/events"          element={<ErrorBoundary><EventsPage /></ErrorBoundary>} />
        <Route path="/activity"        element={<ErrorBoundary><ViralFeedPage /></ErrorBoundary>} />
        <Route path="/profile"         element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
        {/* Both routes handled by same component — username lookup OR userId lookup */}
        <Route path="/profile/:userId" element={<ErrorBoundary><PublicProfilePage /></ErrorBoundary>} />
        <Route path="/user/:username"  element={<ErrorBoundary><PublicProfilePage /></ErrorBoundary>} />
        <Route path="/admin"           element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*"             element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
