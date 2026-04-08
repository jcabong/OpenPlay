import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
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
import LoadingScreen from './components/LoadingScreen'
import UsernameSetup from './components/UsernameSetup'
import AuthCallback from './pages/AuthCallback'

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
        <Route path="/"                element={<FeedPage />} />
        <Route path="/log"             element={<LogGamePage />} />
        <Route path="/ranks"           element={<LeaderboardPage />} />
        <Route path="/events"          element={<EventsPage />} />
        <Route path="/profile"         element={<ProfilePage />} />
        <Route path="/user/:userId"    element={<PublicProfilePage />} />
        <Route path="/admin"           element={<AdminPage />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*"             element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </AuthProvider>
  )
}