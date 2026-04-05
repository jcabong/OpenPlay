import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isMountedRef          = useRef(true)
  const fetchingRef           = useRef(false)

  // ─── Fetch profile (with double-fetch guard) ──────────────────────────────
  async function fetchProfile(userId) {
    if (fetchingRef.current) return      // prevent race between initAuth + onAuthStateChange
    fetchingRef.current = true
    try {
      console.log('🟡 Fetching profile for:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!isMountedRef.current) return

      if (error) {
        console.log('🔴 Profile fetch error:', error.message)
        setProfile(null)
      } else if (!data) {
        console.log('🟡 Profile not found yet')
        setProfile(null)
      } else {
        console.log('🟢 Profile fetched:', data.username || 'no username yet')
        setProfile(data)
      }
    } catch (err) {
      console.error('🔴 fetchProfile exception:', err)
      if (isMountedRef.current) setProfile(null)
    } finally {
      fetchingRef.current = false
      if (isMountedRef.current) setLoading(false)
    }
  }

  // ─── Shared session handler (reused by init, auth listener, and visibility) 
  async function handleSession(session) {
    if (!isMountedRef.current) return
    setUser(session?.user ?? null)
    if (session?.user) {
      await fetchProfile(session.user.id)
    } else {
      setProfile(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // ── Safety timeout: never leave the user on a blank/loading screen ───────
    // Covers the desktop bug where loading stays true if init silently stalls
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('⚠️ Safety timeout fired — forcing loading:false')
        setLoading(false)
      }
    }, 5000)

    // ── Initial session check ─────────────────────────────────────────────────
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('🟢 Session after init:', session?.user?.id ?? 'none')
        await handleSession(session)
      } catch (err) {
        console.error('🔴 Init error:', err)
        if (isMountedRef.current) setLoading(false)
      } finally {
        clearTimeout(safetyTimeout)
      }
    }

    initAuth()

    // ── Auth state listener (login, logout, token refresh) ────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟡 Auth state change:', event, session?.user?.id ?? 'none')
      await handleSession(session)
    })

    // ── Visibility handler: re-validate session when app returns to foreground ─
    // Fixes: mobile stuck on loading after switching apps (iOS PWA + Safari/Chrome)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁 App back to foreground — re-checking session')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          await handleSession(session)
        } catch (err) {
          console.error('🔴 Visibility recheck error:', err)
          if (isMountedRef.current) setLoading(false)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMountedRef.current = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // ─── Auth actions ─────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
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
