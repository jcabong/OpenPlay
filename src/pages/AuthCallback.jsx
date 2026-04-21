import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Fix: Handle both hash-based (implicit) and PKCE (code) flows
        const hash   = window.location.hash
        const search = window.location.search
        const params = new URLSearchParams(search)
        const code   = params.get('code')

        if (code) {
          // PKCE flow — Supabase exchanges the code automatically when
          // detectSessionInUrl is true (set in our client config).
          // Just wait for the session to be set.
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (hash) {
          // Legacy implicit flow fallback
          const hashParams     = new URLSearchParams(hash.substring(1))
          const accessToken    = hashParams.get('access_token')
          const refreshToken   = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token:  accessToken,
              refresh_token: refreshToken,
            })
            if (error) throw error
          }
        }

        navigate('/', { replace: true })
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
