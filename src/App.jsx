import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import LogGamePage from './pages/LogGamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import LoadingScreen from './components/LoadingScreen'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<FeedPage />} />
        <Route path="/log"        element={<LogGamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile"    element={<ProfilePage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
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
