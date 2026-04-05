import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId, retryCount = 0) {
    try {
      console.log('🟡 Fetching profile for:', userId, 'attempt:', retryCount)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.log('🔴 Profile fetch error:', error.message)
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1500)
          return
        }
        setProfile(null)
        setLoading(false)
        return
      }
      
      if (!data) {
        console.log('🟡 Profile not found yet, retrying...')
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1500)
          return
        }
        setProfile(null)
        setLoading(false)
        return
      }
      
      console.log('🟢 Profile fetched:', data.username || 'no username yet')
      setProfile(data)
      setLoading(false)
    } catch (err) {
      console.error('🔴 fetchProfile exception:', err)
      if (retryCount < 3) {
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1500)
        return
      }
      setProfile(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    let safetyTimeout

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('🟢 Session after init:', session?.user?.id)
        
        if (isMounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id)
          } else {
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('🔴 Init error:', err)
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Safety timeout - force loading to false after 5 seconds
    safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log('⚠️ Safety timeout: forcing loading to false');
        setLoading(false);
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🟡 Auth state change:', event, session?.user?.id)
      if (isMounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/login`,
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