import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isMountedRef          = useRef(true)
  const fetchingRef           = useRef(false)
  const lastUserIdRef         = useRef(null)

  // ─── Fetch profile ─────────────────────────────────────────
  async function fetchProfile(userId) {
    // Skip duplicate fetch for the same user while one is already in flight
    if (fetchingRef.current && lastUserIdRef.current === userId) {
      return
    }
    fetchingRef.current = true
    lastUserIdRef.current = userId

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
      fetchingRef.current = false
      // Fix: only set loading false AFTER profile is fetched, preventing
      // the flash where loading=false but profile=null causes username modal
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // Safety valve — if something hangs for 8s, unblock the UI
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('Auth safety timeout fired')
        setLoading(false)
      }
    }, 8000)

    // onAuthStateChange is the single source of truth.
    // INITIAL_SESSION fires immediately on mount with the cached session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return

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
        // Don't set loading=false until profile is loaded to prevent flash
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
        setLoading(false)
      }

      clearTimeout(safetyTimeout)
    })

    // Refetch on app foreground (handles iOS PWA kill/resume)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
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
          console.error('Visibility recheck error:', err)
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

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // PKCE is set in supabase.js client config
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshProfile = () => {
    if (user) {
      fetchingRef.current = false
      lastUserIdRef.current = null
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
