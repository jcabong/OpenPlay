import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isMountedRef          = useRef(true)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!isMountedRef.current) return

      if (error) {
        console.error('Profile fetch error:', error.message)
        setProfile(null)
      } else {
        setProfile(data ?? null)
      }
    } catch (err) {
      console.error('fetchProfile exception:', err)
      if (isMountedRef.current) setProfile(null)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // ── Step 1: getSession on mount ────────────────────────────────────────
    // This is critical for the post-OAuth redirect case.
    // onAuthStateChange alone can be too slow after exchangeCodeForSession.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // ── Step 2: onAuthStateChange for future changes ───────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return

      console.log('Auth event:', event)

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      // TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED etc.
      const currentUser = session?.user ?? null
      if (currentUser) {
        setUser(currentUser)
        // Only re-fetch profile if user changed
        // (avoids redundant fetch if getSession already handled it)
        fetchProfile(currentUser.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    // ── Step 3: Visibility handler ─────────────────────────────────────────
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        if (isMountedRef.current) {
          setUser(currentUser)
          if (currentUser) {
            await fetchProfile(currentUser.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Visibility recheck error:', err)
        if (isMountedRef.current) setLoading(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
