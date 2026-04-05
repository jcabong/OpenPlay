import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // ── PKCE flow: ?code= in query string ──────────────────────────────
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('exchangeCodeForSession error:', error.message)
            navigate('/login', { replace: true })
            return
          }

          if (data?.session) {
            // Session is set — onAuthStateChange in useAuth will fire,
            // fetch the profile, and clear loading. Just navigate.
            navigate('/', { replace: true })
            return
          }
        }

        // ── Implicit flow fallback: #access_token= in hash ─────────────────
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
            if (error) {
              console.error('setSession error:', error.message)
              navigate('/login', { replace: true })
              return
            }
            navigate('/', { replace: true })
            return
          }
        }

        // ── No tokens in URL — check if session already exists ─────────────
        // This handles the case where Supabase processed the callback itself
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          navigate('/', { replace: true })
        } else {
          console.error('No session found after OAuth callback')
          navigate('/login', { replace: true })
        }

      } catch (err) {
        console.error('Auth callback exception:', err)
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
