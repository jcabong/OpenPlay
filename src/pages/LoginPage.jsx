import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
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
      alert('Check your email for confirmation link! After confirming, sign in below.')
      setIsLogin(true)
    }
    setLoading(false)
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
    setLoading(false)
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

        {/* Toggle between Login and Sign Up */}
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
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={isLogin ? handleEmailSignIn : handleEmailSignUp} className="w-full max-w-sm space-y-4">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white text-sm"
            required
          />
          
          {error && <p className="text-spark text-xs text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-ink-900 font-bold text-base py-3 rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-ink-600 text-[10px] mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>

      <div className="text-center pb-6 relative z-10">
        <p className="text-ink-700 text-[9px] tracking-widest uppercase">
          Built for racket players
        </p>
      </div>
    </div>
  )
}