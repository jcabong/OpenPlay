// src/pages/AuthCallback.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
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
            // ✅ Ensure profile exists (fallback if trigger failed)
            await ensureProfile(data.session.user)
            navigate('/', { replace: true })
            return
          }
        }

        const hash = window.location.hash
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) {
              navigate('/login', { replace: true })
              return
            }
            if (data?.session) {
              await ensureProfile(data.session.user)
            }
            navigate('/', { replace: true })
            return
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await ensureProfile(session.user)
          navigate('/', { replace: true })
        } else {
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

// Fallback: create profile if the DB trigger missed it
async function ensureProfile(user) {
  if (!user) return
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) {
    const baseUsername = (user.email?.split('@')[0] || 'player')
      .replace(/[^a-zA-Z0-9_]/g, '')
    
    await supabase.from('users').insert({
      id: user.id,
      username: baseUsername + '_' + Math.random().toString(36).slice(2, 6),
      display_name: user.user_metadata?.full_name || baseUsername,
      avatar_url: user.user_metadata?.avatar_url || null,
      avatar_type: user.user_metadata?.avatar_url ? 'google' : 'initials',
    })
  }
}