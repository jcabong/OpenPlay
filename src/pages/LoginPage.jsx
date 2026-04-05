import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true) // true = Sign In, false = Sign Up
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/')
      }
    }
    checkSession()
  }, [navigate])

  // Email Sign Up (for new users)
  async function handleEmailSignUp(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    
    if (error) {
      setError(error.message)
    } else {
      alert('✅ Check your email for confirmation link!\n\nAfter confirming, sign in with Google or Email.')
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  // Google Sign In (for existing users)
  async function handleGoogleSignIn() {
    setLoading(true)
    await signInWithGoogle()
    // No need to set loading false because page redirects
  }

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-spark/5 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-ink-700 border border-white/10 mb-4">
            <span className="text-4xl">🏸</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-ink-50 tracking-tight mb-1">
            Open<span className="text-accent">Play</span>
          </h1>
          <p className="text-ink-400 text-xs">Track your game. Climb the ranks.</p>
        </div>

        {/* Sport badges */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {SPORTS.map(s => (
            <div key={s.id} className="glass rounded-2xl px-3 py-1.5 flex items-center gap-1">
              <span className="text-sm">{s.emoji}</span>
              <span className="text-[10px] font-bold text-ink-200">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div className="flex gap-2 mb-6 w-full max-w-sm">
          <button
            onClick={() => { setIsLogin(true); setError('') }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-accent text-ink-900' : 'bg-white/5 text-ink-400'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError('') }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-accent text-ink-900' : 'bg-white/5 text-ink-400'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Sign In Section - Google Only */}
        {isLogin ? (
          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-accent text-ink-900 font-bold text-base py-3 rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#111"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#111"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#111"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#111"/>
              </svg>
              Continue with Google
            </button>
            
            {error && <p className="text-spark text-xs text-center">{error}</p>}
            
            <p className="text-center text-ink-600 text-[10px]">
              Existing users sign in with Google
            </p>
          </div>
        ) : (
          /* Sign Up Section - Email/Password */
          <form onSubmit={handleEmailSignUp} className="w-full max-w-sm space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white text-sm"
              required
              minLength={6}
            />
            
            {error && <p className="text-spark text-xs text-center">{error}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-ink-900 font-bold text-base py-3 rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            
            <p className="text-center text-ink-600 text-[10px]">
              New users: Create account then check email to confirm
            </p>
          </form>
        )}
      </div>

      <div className="text-center pb-6 relative z-10">
        <p className="text-ink-700 text-[9px] tracking-widest uppercase">
          Built for racket players
        </p>
      </div>
    </div>
  )
}