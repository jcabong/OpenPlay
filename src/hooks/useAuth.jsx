import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback - check URL hash for tokens
    const handleOAuthRedirect = async () => {
      const hash = window.location.hash
      const params = new URLSearchParams(window.location.search)
      
      // If we have OAuth tokens in URL, let Supabase handle it
      if (hash.includes('access_token') || params.get('code')) {
        console.log('🟡 OAuth callback detected, waiting for session...')
        // Supabase will automatically process the callback
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🟢 Session after init:', !!session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }
    
    handleOAuthRedirect()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🟡 Auth state change:', _event, !!session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      console.log('🟡 Fetching profile for:', userId)
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
      if (error) {
        console.log('🟡 Profile not found yet (trigger may be running):', error.message)
        // Profile might not exist yet, retry after delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        const { data: retryData, error: retryError } = await supabase.from('users').select('*').eq('id', userId).single()
        if (!retryError) {
          setProfile(retryData)
        }
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('🔴 fetchProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/login`,  // Redirect to login page which will handle callback
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshProfile = () => user && fetchProfile(user.id)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)