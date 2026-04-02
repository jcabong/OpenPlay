import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

import Layout          from './components/Layout'
import LoadingScreen   from './components/LoadingScreen'
import UsernameSetup   from './components/UsernameSetup'
import LoginPage       from './pages/LoginPage'
import FeedPage        from './pages/FeedPage'
import LogGamePage     from './pages/LogGamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import EventsPage      from './pages/EventsPage'
import ProfilePage     from './pages/ProfilePage'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const [hasUsername, setHasUsername] = useState(true)
  const [checking, setChecking]       = useState(true)

  // Safety net — never stuck longer than 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // No user — stop checking immediately, redirect to login
    if (!user) {
      setChecking(false)
      return
    }
    async function checkProfile() {
      try {
        const { data } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        setHasUsername(!!data?.username)
      } catch {
        setHasUsername(false)
      } finally {
        setChecking(false)
      }
    }
    checkProfile()
  }, [user])

  if (loading || checking) return <LoadingScreen />
  if (!user)               return <Navigate to="/login" replace />

  if (!hasUsername) {
    return (
      <UsernameSetup
        user={user}
        onComplete={() => setHasUsername(true)}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<FeedPage />} />
        <Route path="/log"           element={<LogGamePage />} />
        <Route path="/ranks"         element={<LeaderboardPage />} />
        <Route path="/events"        element={<EventsPage />} />
        <Route path="/profile"       element={<ProfilePage />} />
        <Route path="/profile/:id"   element={<ProfilePage />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*"     element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
