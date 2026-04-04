import { useState, useEffect, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { notifyMentions, sendNotification } from '../hooks/useNotifications'
import { MapPin, Users, Search, Share2, Loader2, X, Image, Zap, Navigation } from 'lucide-react'

// ── Smart location search ───────────────────────────────────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places)
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id    = 'gmap-script'
      script.src   = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const poll = setInterval(() => {
      if (window.google?.maps?.places) {
        setReady(true)
        clearInterval(poll)
      }
    }, 100)
    return () => clearInterval(poll)
  }, [])
  return ready
}

function LocationSearch({ courtName, city, province, onCourtChange, onCityChange, onProvinceChange }) {
  const [query, setQuery]             = useState(courtName || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching]     = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [focused, setFocused]         = useState(false)
  const debounceRef                   = useRef(null)
  const sessionTokenRef               = useRef(null)
  const mapsReady                     = useGoogleMaps()

  useEffect(() => {
    if (mapsReady) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [mapsReady])

  async function searchPlaces(q) {
    if (q.length < 2 || !mapsReady) { setSuggestions([]); return }
    setSearching(true)
    try {
      const result = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["ph"],
      })
      setSuggestions((result.suggestions || []).map(s => {
        const p = s.placePrediction
        return {
          placeId:   p.placeId,
          name:      p.mainText?.text || p.text?.text || "",
          secondary: p.secondaryText?.text || "",
        }
      }))
    } catch(e) {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    onCourtChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 300)
  }

  async function pickSuggestion(s) {
    setQuery(s.name)
    onCourtChange(s.name)
    setSuggestions([])
    try {
      const place = new window.google.maps.places.Place({ id: s.placeId })
      await place.fetchFields({ fields: ['addressComponents'] })
      const comps = place.addressComponents || []
      const cityComp = comps.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3'))
      const provComp = comps.find(c => c.types.includes('administrative_area_level_1'))
      onCityChange(cityComp?.longText || '')
      onProvinceChange(provComp?.longText || '')
    } catch {
      const parts = s.secondary.split(',')
      onCityChange(parts[0]?.trim() || '')
    }
  }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_KEY}`)
        const data = await res.json()
        if (data.results?.[0]) {
          const name = data.results[0].formatted_address.split(',')[0]
          setQuery(name); onCourtChange(name)
        }
      } finally { setGpsLoading(false) }
    }, () => setGpsLoading(false))
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <MapPin size={15} className="text-accent shrink-0" />
        <input
          className="flex-1 py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-white"
          placeholder="Search court or city…"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        <button type="button" onClick={detectGPS} className="p-1.5 text-white/40 hover:text-accent">
          {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        </button>
      </div>
      {focused && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => pickSuggestion(s)} className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-none">
              <p className="text-xs font-bold text-white">{s.name}</p>
              <p className="text-[10px] text-white/40">{s.secondary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LogGamePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    sport: 'badminton', court_name: '', city: '', province: '', result: 'win', score: '', intensity: 'Med', content: ''
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser] = useState(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && !taggedUser) {
        const { data } = await supabase.from('profiles').select('id, username, city').ilike('username', `%${searchQuery}%`).neq('id', user.id).limit(5)
        setSearchResults(data || [])
      } else setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, user.id, taggedUser])

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !user) return
    if (formData.result === 'win' && !taggedUser) return alert('⚠️ Tag your opponent to record a WIN.')
    
    setLoading(true)
    try {
      // 1. Log YOUR match
      const { data: game, error: gErr } = await supabase.from('games').insert([{
        user_id: user.id,
        sport: formData.sport,
        court_name: formData.court_name,
        city: formData.city,
        province: formData.province,
        result: formData.result,
        score: formData.score,
        intensity: formData.intensity,
        opponent_name: taggedUser?.username || searchQuery,
        tagged_opponent_id: taggedUser?.id || null,
        is_deleted: false
      }]).select().single()
      if (gErr) throw gErr

      // 2. Sync OPPONENT'S loss (The Fix)
      if (taggedUser && formData.result === 'win') {
        await supabase.from('games').insert([{
          user_id: taggedUser.id,
          sport: formData.sport,
          court_name: formData.court_name,
          city: formData.city,
          province: formData.province,
          result: 'loss',
          score: formData.score,
          opponent_name: profile?.username || 'Opponent',
          tagged_opponent_id: user.id,
          is_deleted: false // This ensures it shows in their profile logs
        }])
      }

      // 3. Create Feed Post
      const autoContent = `${formData.result.toUpperCase()}! 🏸 vs @${taggedUser?.username || searchQuery} at ${formData.court_name || 'the court'}.`
      await supabase.from('posts').insert([{
        author_id: user.id,
        user_id: user.id,
        content: formData.content || autoContent,
        sport: formData.sport,
        location_name: formData.court_name,
        game_id: game.id,
        is_deleted: false
      }])

      navigate('/')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-32 bg-[#0a0a0f]">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-3xl font-black italic uppercase text-white">Record Match</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SPORTS.map(s => (
            <button key={s.id} type="button" onClick={() => setFormData({ ...formData, sport: s.id })}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black uppercase border-2 transition-all ${
                formData.sport === s.id ? 'bg-accent border-accent text-ink-900 shadow-[0_0_20px_rgba(200,255,0,0.4)]' : 'bg-white/5 border-white/10 text-white/50'
              }`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <LocationSearch 
            courtName={formData.court_name} 
            city={formData.city} 
            province={formData.province}
            onCourtChange={v => setFormData(f => ({ ...f, court_name: v }))}
            onCityChange={v => setFormData(f => ({ ...f, city: v }))}
            onProvinceChange={v => setFormData(f => ({ ...f, province: v }))}
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
            <Users size={15} className="text-white/40" />
            <input className="w-full py-3.5 text-sm font-medium bg-transparent border-none text-white focus:ring-0"
              placeholder="Tag opponent..." value={taggedUser ? `@${taggedUser.username}` : searchQuery}
              onChange={e => { setTaggedUser(null); setSearchQuery(e.target.value) }} />
          </div>
          {searchResults.length > 0 && !taggedUser && (
            <div className="bg-[#1a1a2e] border-b border-white/10">
              {searchResults.map(u => (
                <button key={u.id} type="button" onClick={() => { setTaggedUser(u); setSearchResults([]) }}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-none">
                  @{u.username}
                </button>
              ))}
            </div>
          )}
          <input className="w-full px-4 py-3.5 text-sm bg-transparent border-none text-white focus:ring-0"
            placeholder="Final score (e.g. 21-15)" value={formData.score}
            onChange={e => setFormData({ ...formData, score: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {['win', 'loss'].map(r => (
            <button key={r} type="button" onClick={() => setFormData({ ...formData, result: r })}
              className={`py-5 rounded-[2rem] font-black uppercase italic text-2xl border-2 transition-all ${
                formData.result === r 
                ? (r === 'win' ? 'border-accent text-accent bg-accent/10' : 'border-spark text-spark bg-spark/10')
                : 'border-white/10 text-white/30'
              }`}>
              {r}
            </button>
          ))}
        </div>

        <button type="submit" disabled={loading} className="w-full font-black py-6 rounded-[2.5rem] uppercase italic text-2xl bg-accent text-ink-900 shadow-[0_0_30px_rgba(200,255,0,0.35)] disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Sync Game'}
        </button>
      </form>
    </div>
  )
}