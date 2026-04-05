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
      // Always clear loading — this is the critical fix
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    // Safety net — if everything else fails, clear loading after 6s
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('Safety timeout: forcing loading false')
        setLoading(false)
      }
    }, 6000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        clearTimeout(safetyTimeout)
        return
      }

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // No fetchingRef dedup — just always fetch. The finally block
        // guarantees setLoading(false) runs no matter what.
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
        setLoading(false)
      }

      clearTimeout(safetyTimeout)
    })

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
      clearTimeout(safetyTimeout)
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