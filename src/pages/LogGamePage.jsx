import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Search, Share2, Loader2, X, Image, Zap, Navigation } from 'lucide-react'

// ── Smart location search (OpenStreetMap Nominatim, no API key) ──────────────
function LocationSearch({ courtName, city, onCourtChange, onCityChange }) {
  const [query, setQuery]           = useState(courtName || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching]   = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [focused, setFocused]       = useState(false)
  const debounceRef                 = useRef(null)

  // Show selected location as a badge
  const hasLocation = courtName || city

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
        full: r.display_name,
        city: r.address?.city || r.address?.town || r.address?.municipality || r.address?.county || '',
        name: r.address?.amenity || r.address?.leisure || r.address?.building || r.name || '',
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
    onCourtChange(val)
    onCityChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 350)
  }

  function pickSuggestion(s) {
    setQuery(s.display)
    onCourtChange(s.name || s.display.split(',')[0].trim())
    onCityChange(s.city)
    setSuggestions([])
  }

  function clearLocation() {
    setQuery('')
    onCourtChange('')
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
          const name  = data.address?.amenity || data.address?.leisure || data.address?.building || ''
          const cityVal = data.address?.city || data.address?.town || data.address?.municipality || data.address?.county || ''
          const display = name ? `${name}, ${cityVal}` : cityVal
          setQuery(display)
          onCourtChange(name || display)
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
    <div>
      {/* Court/Location search input row */}
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <MapPin size={15} style={{ color: '#c8ff00', opacity: 0.8 }} className="shrink-0" />
        <input
          className="flex-1 py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          style={{ color: '#ffffff', caretColor: '#c8ff00' }}
          placeholder="Search court or city…"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoComplete="off"
        />
        {searching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {query && !searching && (
          <button type="button" onClick={clearLocation} className="shrink-0 text-white/30 hover:text-white/60">
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={detectGPS}
          disabled={gpsLoading}
          title="Use my location"
          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: gpsLoading ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}
        >
          {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="mx-3 mb-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: '#13131f' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors"
            >
              <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }} />
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {s.display.split(',')[0].trim()}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.display.split(',').slice(1).join(',').trim()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected city badge */}
      {city && (
        <div className="px-4 pb-2 flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
            style={{ background: 'rgba(200,255,0,0.1)', color: '#c8ff00' }}>
            📍 {city}
          </span>
        </div>
      )}
    </div>
  )
}

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading]         = useState(false)
  const [mediaFiles, setMediaFiles]   = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    sport:      'badminton',
    court_name: '',
    city:       '',
    result:     'win',
    score:      '',
    intensity:  'Med',
    content:    '',
  })

  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser]     = useState(null)
  const [isSearching, setIsSearching]   = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && !taggedUser) searchOpponents(searchQuery)
      else setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function searchOpponents(query) {
    setIsSearching(true)
    const { data } = await supabase
      .from('users')
      .select('id, username, city')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5)
    setSearchResults(data || [])
    setIsSearching(false)
  }

  function handleMediaSelect(e) {
    const files = Array.from(e.target.files)
    setMediaFiles(prev => [...prev, ...files].slice(0, 6))
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setMediaPreviews(prev => [...prev, { url, type: file.type.startsWith('video') ? 'video' : 'image' }])
    })
  }

  function removeMedia(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadMedia() {
    const urls = [], types = []
    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('openplay-media').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
        urls.push(publicUrl)
        types.push(file.type.startsWith('video') ? 'video' : 'image')
      }
    }
    return { urls, types }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !user) return
    setLoading(true)

    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length
        ? await uploadMedia()
        : { urls: [], types: [] }

      const { data: game, error: gameError } = await supabase.from('games').insert([{
        user_id:            user.id,
        sport:              formData.sport,
        court_name:         formData.court_name,
        city:               formData.city,
        result:             formData.result,
        score:              formData.score,
        intensity:          formData.intensity,
        opponent_name:      taggedUser ? taggedUser.username : searchQuery,
        tagged_opponent_id: taggedUser?.id || null,
        created_at:         new Date().toISOString(),
      }]).select().single()

      if (gameError) throw gameError

      const sport    = SPORTS.find(s => s.id === formData.sport)
      const opponent = taggedUser ? `@${taggedUser.username}` : searchQuery || 'Open Play'
      const autoContent = `${sport?.emoji} Just logged a ${sport?.label} match at ${formData.court_name || 'the courts'}. Result: ${formData.result.toUpperCase()} (${formData.score || '—'}). Vs: ${opponent}`

      const { error: postError } = await supabase.from('posts').insert([{
        author_id:     user.id,
        user_id:       user.id,
        content:       formData.content || autoContent,
        sport:         formData.sport,
        location_name: formData.court_name,
        city:          formData.city,
        media_urls,
        media_types,
        game_id:       game.id,
        inserted_at:   new Date().toISOString(),
      }])

      if (postError) console.warn('Feed post failed:', postError.message)
      navigate('/')
    } catch (err) {
      alert('Error saving match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-8 rounded-full" style={{ background: '#c8ff00' }} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Record Match</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#c8ff00', opacity: 0.7 }}>
          Sync your performance
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-5">

        {/* Sport Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFormData({ ...formData, sport: s.id })}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase border-2 transition-all duration-200"
              style={formData.sport === s.id
                ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.4)' }
                : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }
              }
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Location Card */}
        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.8 }}>📍 Location</p>
          </div>
          <LocationSearch
            courtName={formData.court_name}
            city={formData.city}
            onCourtChange={v => setFormData(f => ({ ...f, court_name: v }))}
            onCityChange={v => setFormData(f => ({ ...f, city: v }))}
          />
        </div>

        {/* Match Details Card */}
        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>⚔️ Match Details</p>
          </div>

          {/* Opponent search */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
              <Users size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
              <input
                className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
                style={{ color: taggedUser ? '#c8ff00' : '#ffffff', caretColor: '#c8ff00' }}
                placeholder="Tag opponent (username)"
                value={taggedUser ? `@${taggedUser.username}` : searchQuery}
                onChange={e => { setTaggedUser(null); setSearchQuery(e.target.value) }}
              />
              {isSearching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
              {taggedUser && (
                <button type="button" onClick={() => { setTaggedUser(null); setSearchQuery('') }} className="shrink-0 text-red-400">
                  <X size={15} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && !taggedUser && (
              <div className="absolute z-50 w-full mt-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#1a1a2e' }}>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setTaggedUser(u); setSearchResults([]) }}
                    className="w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-white/5 last:border-none transition-colors hover:bg-white/10"
                  >
                    <span className="font-bold text-white">@{u.username}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
            <Search size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
            <input
              className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
              style={{ color: '#ffffff', caretColor: '#c8ff00' }}
              placeholder="Final score  e.g. 21-18, 21-15"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: e.target.value })}
            />
          </div>

          {/* Caption */}
          <div className="px-4 py-3">
            <textarea
              className="w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
              style={{ color: '#ffffff', caretColor: '#c8ff00' }}
              placeholder="Add a caption (optional)..."
              rows={3}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
        </div>

        {/* Win / Loss */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Result</p>
          <div className="grid grid-cols-2 gap-3">
            {['win', 'loss'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData({ ...formData, result: r })}
                className="py-5 rounded-[2rem] font-black uppercase italic tracking-tighter text-2xl border-2 transition-all duration-300"
                style={formData.result === r
                  ? r === 'win'
                    ? { borderColor: '#c8ff00', color: '#c8ff00', background: 'rgba(200,255,0,0.08)', boxShadow: '0 0 24px rgba(200,255,0,0.25)' }
                    : { borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255,77,77,0.08)', boxShadow: '0 0 24px rgba(255,77,77,0.2)' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)' }
                }
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} style={{ color: '#c8ff00', opacity: 0.8 }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Intensity</p>
          </div>
          <div className="flex gap-2">
            {[
              { lvl: 'Low',  active: { background: 'rgba(59,130,246,0.15)', borderColor: '#60a5fa', color: '#93c5fd' }, dot: '#60a5fa' },
              { lvl: 'Med',  active: { background: 'rgba(234,179,8,0.15)',  borderColor: '#facc15', color: '#fde68a' }, dot: '#facc15' },
              { lvl: 'High', active: { background: 'rgba(239,68,68,0.15)',  borderColor: '#f87171', color: '#fca5a5' }, dot: '#f87171' },
            ].map(({ lvl, active, dot }) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFormData({ ...formData, intensity: lvl })}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 transition-all flex items-center justify-center gap-1.5"
                style={formData.intensity === lvl
                  ? active
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: formData.intensity === lvl ? dot : 'rgba(255,255,255,0.2)' }} />
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Media Upload */}
        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>📷 Photos / Video</p>
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mediaPreviews.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  {m.type === 'video'
                    ? <video src={m.url} className="w-full h-full object-cover" />
                    : <img src={m.url} alt="" className="w-full h-full object-cover" />
                  }
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold border-2 border-dashed transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}
          >
            <Image size={15} />
            Add Photos or Video
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full font-black py-6 rounded-[2.5rem] uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            background: loading ? 'rgba(200,255,0,0.5)' : '#c8ff00',
            color: '#0a0a0f',
            boxShadow: '0 0 30px rgba(200,255,0,0.35)',
          }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Share2 size={22} /> Sync Game</>}
        </button>
      </form>
    </div>
  )
}
