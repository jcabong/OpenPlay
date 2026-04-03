import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Navigation, Loader2, X } from 'lucide-react'

function LocationSearch({ city, onCityChange }) {
  const [query, setQuery]         = useState(city || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [focused, setFocused]     = useState(false)
  const debounceRef               = useRef(null)

  async function searchPlaces(q) {
    if (q.length < 2) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=ph`
      )
      const data = await res.json()
      setSuggestions(data.map(r => ({
        display: r.display_name.split(',').slice(0, 2).join(',').trim(),
        city: r.address?.city || r.address?.town || r.address?.municipality || r.address?.county || '',
      })))
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    onCityChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 350)
  }

  function pickSuggestion(s) {
    const cityVal = s.city || s.display.split(',')[0].trim()
    setQuery(cityVal)
    onCityChange(cityVal)
    setSuggestions([])
  }

  function clear() {
    setQuery('')
    onCityChange('')
    setSuggestions([])
  }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          )
          const data = await res.json()
          const cityVal = data.address?.city || data.address?.town || data.address?.municipality || data.address?.county || ''
          setQuery(cityVal)
          onCityChange(cityVal)
        } catch {
          alert('Could not get location')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { setGpsLoading(false); alert('Location access denied') }
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-accent/50 transition-all">
        <MapPin size={16} className="text-accent shrink-0" />
        <input
          type="text"
          placeholder="Search your city…"
          className="flex-1 bg-transparent py-4 text-ink-50 text-sm focus:outline-none"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoComplete="off"
        />
        {searching && <Loader2 size={14} className="animate-spin text-white/30 shrink-0" />}
        {query && !searching && (
          <button type="button" onClick={clear} className="text-white/30 hover:text-white/60 shrink-0">
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={detectGPS}
          disabled={gpsLoading}
          className="shrink-0 text-white/40 hover:text-accent transition-colors"
          title="Use my location"
        >
          {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        </button>
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#13131f' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors"
            >
              <MapPin size={12} className="text-accent shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">{s.display.split(',')[0].trim()}</p>
                <p className="text-[10px] text-white/40">{s.display.split(',').slice(1).join(',').trim()}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UsernameSetup({ user, onComplete }) {
  const [step, setStep]         = useState(1)
  const [username, setUsername] = useState('')
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
      .update({ username: username.toLowerCase().trim(), city })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message.includes('unique') ? 'Username is already taken!' : 'Something went wrong. Try again.')
      setLoading(false)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-ink-900 flex items-center justify-center p-6">
      <div className="glass rounded-[2.5rem] p-8 w-full max-w-md border border-white/10 shadow-2xl">

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-8">
          {[1, 2].map(n => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${step === n ? 'w-8 bg-accent' : 'w-2 bg-white/20'}`} />
          ))}
        </div>

        {/* Step 1 — Username */}
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
              type="button"
              onClick={() => {
                if (username.length < 3) { setError('Username must be at least 3 characters'); return }
                setError('')
                setStep(2)
              }}
              className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl hover:bg-accent/90 transition-all glow-accent"
            >
              Next →
            </button>
          </>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-ink-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                📍
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">Where do you play?</h2>
              <p className="text-ink-500 text-sm">Used for local leaderboards</p>
            </div>

            <div className="mb-4">
              <LocationSearch city={city} onCityChange={setCity} />
              {city && (
                <p className="text-xs font-bold mt-2 ml-1" style={{ color: '#c8ff00' }}>
                  📍 {city}
                </p>
              )}
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
