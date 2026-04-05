import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isMountedRef          = useRef(true)
  const fetchingRef           = useRef(false)
  const lastUserIdRef         = useRef(null)   // tracks which user we last fetched for

  // ─── Fetch profile ────────────────────────────────────────────────────────
  async function fetchProfile(userId) {
    // If already fetching for this exact user, skip — don't hang
    if (fetchingRef.current && lastUserIdRef.current === userId) {
      console.log('⏭ Skipping duplicate fetch for:', userId)
      return
    }
    fetchingRef.current = true
    lastUserIdRef.current = userId

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
      } else {
        console.log('🟢 Profile fetched:', data?.username || 'no username')
        setProfile(data ?? null)
      }
    } catch (err) {
      console.error('🔴 fetchProfile exception:', err)
      if (isMountedRef.current) setProfile(null)
    } finally {
      fetchingRef.current = false
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // Safety timeout — last resort if something still goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('⚠️ Safety timeout fired — forcing loading:false')
        setLoading(false)
      }
    }, 8000)

    // ── onAuthStateChange is the single source of truth ───────────────────
    // Supabase fires INITIAL_SESSION on mount, then SIGNED_IN after OAuth.
    // We deduplicate by checking if we're already fetching for the same userId.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟡 Auth state change:', event, session?.user?.id ?? 'none')

      if (!isMountedRef.current) return

      // SIGNED_OUT — clear everything immediately
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        fetchingRef.current = false
        lastUserIdRef.current = null
        clearTimeout(safetyTimeout)
        return
      }

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
        setLoading(false)
      }

      clearTimeout(safetyTimeout)
    })

    // ── Visibility handler ────────────────────────────────────────────────
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁 App foregrounded — re-checking session')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const currentUser = session?.user ?? null
          if (isMountedRef.current) {
            setUser(currentUser)
            if (currentUser) {
              // Force re-fetch on foreground (user may have changed)
              fetchingRef.current = false
              await fetchProfile(currentUser.id)
            } else {
              setProfile(null)
              setLoading(false)
            }
          }
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshProfile = () => {
    if (user) {
      fetchingRef.current = false      // unlock so refresh always runs
      lastUserIdRef.current = null     // clear dedup so re-fetch is allowed
      fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
