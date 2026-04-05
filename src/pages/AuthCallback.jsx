import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle PKCE code exchange (query string)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          navigate('/', { replace: true })
          return
        }

        // Handle implicit flow fallback (hash tokens)
        const hash = window.location.hash
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) throw error
            navigate('/', { replace: true })
            return
          }
        }

        // No tokens found — onAuthStateChange will handle it
        // Just wait briefly for Supabase to pick up the session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          navigate('/', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }

      } catch (err) {
        console.error('Auth callback error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-ink-400 text-sm font-mono tracking-widest uppercase">Signing in...</p>
      </div>
    </div>
  )
}