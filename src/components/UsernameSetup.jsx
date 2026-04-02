import { useState } from 'react'
import { supabase, REGIONS, CITIES_BY_REGION } from '../lib/supabase'

export default function UsernameSetup({ user, onComplete }) {
  const [step, setStep]         = useState(1) // 1 = username, 2 = location
  const [username, setUsername] = useState('')
  const [region, setRegion]     = useState('')
  const [city, setCity]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (username.length < 3) return setError('Username must be at least 3 characters')
    if (!city) return setError('Please select your city')

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('users')
      .update({ username: username.toLowerCase().trim(), city, region })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message.includes('unique') ? 'Username is already taken!' : 'Something went wrong. Try again.')
      setLoading(false)
    } else {
      onComplete()
    }
  }

  const cities = region ? (CITIES_BY_REGION[region] || []) : []

  return (
    <div className="fixed inset-0 z-[100] bg-ink-900 flex items-center justify-center p-6">
      <div className="glass rounded-[2.5rem] p-8 w-full max-w-md border border-white/10 shadow-2xl">

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-8">
          {[1,2].map(n => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${step === n ? 'w-8 bg-accent' : 'w-2 bg-white/20'}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center font-display font-bold text-ink-900 text-2xl mx-auto mb-4 glow-accent">
                @
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">Claim your handle</h2>
              <p className="text-ink-500 text-sm">Your unique identity on OpenPlay</p>
            </div>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-bold text-lg">@</span>
              <input
                type="text"
                placeholder="username"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-ink-50 focus:border-accent/50 focus:outline-none transition-all text-sm"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                autoFocus
              />
            </div>
            {error && <p className="text-spark text-xs font-bold uppercase tracking-wider mb-4">{error}</p>}
            <button
              onClick={() => { if (username.length < 3) { setError('Username must be at least 3 characters'); return; } setError(''); setStep(2) }}
              className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl hover:bg-accent/90 transition-all glow-accent"
            >
              Next →
            </button>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-ink-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                📍
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">Where do you play?</h2>
              <p className="text-ink-500 text-sm">Used for local leaderboards</p>
            </div>

            <div className="space-y-3 mb-4">
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-ink-50 focus:border-accent/50 focus:outline-none transition-all text-sm appearance-none"
                value={region}
                onChange={e => { setRegion(e.target.value); setCity('') }}
                required
              >
                <option value="">Select your region...</option>
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>

              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-ink-50 focus:border-accent/50 focus:outline-none transition-all text-sm appearance-none disabled:opacity-40"
                value={city}
                onChange={e => setCity(e.target.value)}
                disabled={!region}
                required
              >
                <option value="">Select your city...</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <p className="text-spark text-xs font-bold uppercase tracking-wider mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-4 glass rounded-2xl text-ink-400 text-sm font-bold"
              >
                ←
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl hover:bg-accent/90 disabled:opacity-50 transition-all glow-accent"
              >
                {loading ? 'Setting up...' : 'Start Playing'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
