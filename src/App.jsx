import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

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
  const { user, loading } = useAuth()
  const [hasUsername, setHasUsername] = useState(true)
  const [checking, setChecking]       = useState(false)

  useEffect(() => {
    console.log('🔵 ProtectedRoutes - loading:', loading)
    console.log('🔵 ProtectedRoutes - user:', user?.id)
    
    if (loading) return
    if (!user) {
      console.log('🔵 No user, setting checking false')
      setChecking(false)
      return
    }

    async function checkProfile() {
      console.log('🔵 Checking profile for user:', user.id)
      setChecking(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        
        console.log('🔵 Profile check result:', { data, error })
        
        if (error) {
          console.log('🔵 Error fetching profile:', error.message)
        }
        
        setHasUsername(!!data?.username)
        console.log('🔵 hasUsername:', !!data?.username)
      } catch (err) {
        console.error('🔴 Profile check error:', err)
        setHasUsername(false)
      } finally {
        setChecking(false)
      }
    }
    checkProfile()
  }, [user, loading])

  console.log('🔵 Rendering state - loading:', loading, 'checking:', checking, 'user:', !!user, 'hasUsername:', hasUsername)

  if (loading || checking) return <LoadingScreen />
  if (!user)               return <Navigate to="/login" replace />

  if (!hasUsername) {
    console.log('🔵 Showing UsernameSetup')
    return (
      <UsernameSetup
        user={user}
        onComplete={() => {
          console.log('🔵 UsernameSetup completed, setting hasUsername to true')
          setHasUsername(true)
        }}
      />
    )
  }

  console.log('🔵 Showing main Layout')
  return (
    <Layout>
      <Routes>
        <Route path="/"                element={<FeedPage />} />
        <Route path="/log"             element={<LogGamePage />} />
        <Route path="/ranks"           element={<LeaderboardPage />} />
        <Route path="/events"          element={<EventsPage />} />
        <Route path="/profile"         element={<ProfilePage />} />
        <Route path="/admin"           element={<AdminPage />} />
        <Route path="/user/:username"  element={<PublicProfilePage />} />
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}