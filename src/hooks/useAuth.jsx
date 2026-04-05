import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true) // true until BOTH auth + profile are resolved
  const isMountedRef          = useRef(true)
  const fetchingRef           = useRef(false)
  const initializedRef        = useRef(false)  // ensures initAuth only runs once

  // ─── Fetch profile ────────────────────────────────────────────────────────
  async function fetchProfile(userId) {
    // Allow re-fetch if explicitly called (e.g. refreshProfile)
    // but block duplicate concurrent calls
    if (fetchingRef.current) return
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

    // ── Safety timeout ────────────────────────────────────────────────────
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.warn('⚠️ Safety timeout fired — forcing loading:false')
        setLoading(false)
      }
    }, 6000)

    // ── onAuthStateChange is the single source of truth ───────────────────
    // We do NOT call initAuth separately — instead we let the listener fire
    // INITIAL_SESSION (which Supabase always emits on mount) to kick everything off.
    // This eliminates the race between initAuth + the listener both calling fetchProfile.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟡 Auth state change:', event, session?.user?.id ?? 'none')

      if (!isMountedRef.current) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Reset fetch lock so a fresh fetch always runs on auth events
        fetchingRef.current = false
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
        setLoading(false)
      }

      // Clear safety timeout once we've had our first auth event
      if (!initializedRef.current) {
        initializedRef.current = true
        clearTimeout(safetyTimeout)
      }
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

  // refreshProfile — call this anywhere after updating the users table
  // e.g. after UsernameSetup saves, or after Edit Profile saves city/region
  const refreshProfile = () => {
    if (user) {
      fetchingRef.current = false  // force unlock so re-fetch always runs
      fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
