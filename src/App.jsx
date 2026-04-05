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
  const { user, profile, loading, refreshProfile } = useAuth()

  // ── Wait for BOTH auth AND profile to finish loading ─────────────────────
  // Previously, profile=null during fetch was mistaken for "no profile exists",
  // causing UsernameSetup to flash for existing users on login.
  // Now we stay on LoadingScreen until we're certain what profile contains.
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />

  // If user exists but profile is still null, keep waiting (fetch in progress)
  // Safety: useAuth has a 5s timeout so this never hangs forever
  if (user && profile === null) return <LoadingScreen />

  // Only show UsernameSetup if username is genuinely missing or empty string
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
