import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase' 
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import LogGamePage from './pages/LogGamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import EventsPage from './pages/EventsPage'        // Added import
import HostEventPage from './pages/HostEventPage'  // Added import
import LoadingScreen from './components/LoadingScreen'
import UsernameSetup from './components/UsernameSetup'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const [hasUsername, setHasUsername] = useState(true)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkUsername() {
      if (!user) return
      try {
        const { data } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        
        setHasUsername(!!data?.username)
      } catch (err) {
        console.error("Profile check failed", err)
        // If profile doesn't exist yet, force setup
        setHasUsername(false)
      } finally {
        setChecking(false)
      }
    }
    checkUsername()
  }, [user])

  if (loading || checking) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  
  if (!hasUsername) {
    return <UsernameSetup user={user} onComplete={() => setHasUsername(true)} />
  }
  
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<FeedPage />} />
        <Route path="/log"         element={<LogGamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile"     element={<ProfilePage />} />
        <Route path="/events"      element={<EventsPage />} />        {/* Added route */}
        <Route path="/host-event"  element={<HostEventPage />} />     {/* Added route */}
        <Route path="*"            element={<Navigate to="/" replace />} />
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