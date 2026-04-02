import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SPORTS } from '../lib/supabase'

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-spark/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="mb-14 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-ink-700 border border-white/10 mb-6 shadow-2xl">
            <span className="text-5xl">🏸</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-ink-50 tracking-tight mb-2">
            Open<span className="text-accent">Play</span>
          </h1>
          <p className="text-ink-400 text-sm font-body max-w-xs">
            Track your game. Climb the ranks.<br />Dominate your city.
          </p>
        </div>

        {/* Sport badges */}
        <div className="flex flex-wrap gap-2 justify-center mb-14">
          {SPORTS.map(s => (
            <div key={s.id} className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">{s.emoji}</span>
              <span className="text-xs font-bold text-ink-200">{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-accent text-ink-900 font-display font-bold text-base py-4 px-6 rounded-2xl hover:bg-accent/90 active:scale-[0.98] transition-all duration-150 glow-accent shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#111"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#111"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#111"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#111"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-center text-ink-600 text-xs">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>

      <div className="text-center pb-8 relative z-10">
        <p className="text-ink-700 text-[10px] font-mono tracking-widest uppercase">
          Built for racket players
        </p>
      </div>
    </div>
  )
}
