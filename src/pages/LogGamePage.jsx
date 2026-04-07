import { useState, useEffect, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { notifyMentions, sendNotification } from '../hooks/useNotifications'
import { MapPin, Users, Search, Share2, Loader2, X, Image, Zap, Navigation } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import RatingModal from '../components/RatingModal'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const compressionOptions = {
  maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg',
}
async function compressImage(file) {
  if (file.type.startsWith('video')) return file
  if (file.size < 500 * 1024) return file
  try { return await imageCompression(file, compressionOptions) } catch { return file }
}

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places)
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return }
    let script = document.getElementById('gmap-script')
    if (!script) {
      script = document.createElement('script')
      script.id = 'gmap-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`
      script.async = true; script.defer = true
      document.head.appendChild(script)
    }
    const poll = setInterval(() => { if (window.google?.maps?.places) { setReady(true); clearInterval(poll) } }, 150)
    return () => clearInterval(poll)
  }, [])
  return ready
}

function LocationSearch({ courtName, city, province, onCourtChange, onCityChange, onProvinceChange }) {
  const [query, setQuery] = useState(courtName || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef(null)
  const sessionTokenRef = useRef(null)
  const mapsReady = useGoogleMaps()

  useEffect(() => {
    if (mapsReady && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [mapsReady])

  async function searchPlaces(q) {
    if (!q || q.length < 2 || !mapsReady || !window.google?.maps?.places) { setSuggestions([]); return }
    setSearching(true)
    try {
      const result = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken: sessionTokenRef.current, includedRegionCodes: ['ph'],
      })
      setSuggestions((result.suggestions || []).map(s => {
        const p = s.placePrediction
        return { placeId: p.placeId, name: p.mainText?.text || p.text?.text || '', secondary: p.secondaryText?.text || '' }
      }))
    } catch (e) { console.error('Places error:', e); setSuggestions([]) }
    finally { setSearching(false) }
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val); onCourtChange(val); onCityChange(''); onProvinceChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 300)
  }

  async function pickSuggestion(s) {
    setQuery(s.name); onCourtChange(s.name); setSuggestions([])
    try {
      const place = new window.google.maps.places.Place({ id: s.placeId, requestedLanguage: 'en' })
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] })
      const comps = place.addressComponents || []
      const locality = comps.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3') || c.types.includes('sublocality_level_1') || c.types.includes('sublocality'))
      const provinceComp = comps.find(c => c.types.includes('administrative_area_level_2') || c.types.includes('administrative_area_level_1'))
      let cityVal = locality?.longText || locality?.long_name || ''
      let provinceVal = provinceComp?.longText || provinceComp?.long_name || ''
      if (!cityVal && s.secondary) { const parts = s.secondary.split(',').map(p => p.trim()); cityVal = parts[0] || ''; provinceVal = parts[1] || provinceVal }
      onCityChange(cityVal); onProvinceChange(provinceVal)
    } catch {
      const parts = s.secondary.split(',').map(p => p.trim()).filter(Boolean)
      onCityChange(parts[0] || ''); onProvinceChange(parts[1] || '')
    }
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }

  function clearLocation() { setQuery(''); onCourtChange(''); onCityChange(''); onProvinceChange(''); setSuggestions([]) }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_KEY}`)
          const data = await res.json()
          if (!data.results?.length) { alert('Could not determine location'); setGpsLoading(false); return }
          let name = '', cityVal = '', provinceVal = ''
          for (const result of data.results) {
            const c = result.address_components
            const premise = c.find(x => x.types.includes('premise'))
            const estab = c.find(x => x.types.includes('establishment'))
            const poi = c.find(x => x.types.includes('point_of_interest'))
            const route = c.find(x => x.types.includes('route'))
            const locality = c.find(x => x.types.includes('locality') || x.types.includes('administrative_area_level_3'))
            const provinceCo = c.find(x => x.types.includes('administrative_area_level_2') || x.types.includes('administrative_area_level_1'))
            if (!name) name = premise?.long_name || estab?.long_name || poi?.long_name || route?.long_name || ''
            if (!cityVal) cityVal = locality?.long_name || ''
            if (!provinceVal) provinceVal = provinceCo?.long_name || ''
            if (name && cityVal) break
          }
          if (!name) name = data.results[0].formatted_address.split(',')[0].trim()
          setQuery(name); onCourtChange(name); onCityChange(cityVal); onProvinceChange(provinceVal)
        } catch { alert('Could not get location. Try searching manually.') }
        finally { setGpsLoading(false) }
      },
      err => {
        setGpsLoading(false)
        if (err.code === 1) alert('Location access denied. Enable location in browser settings.')
        else if (err.code === 2) alert('Location unavailable. Try again.')
        else alert('Location request timed out.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <MapPin size={15} style={{ color: '#c8ff00', opacity: 0.8 }} className="shrink-0" />
        <input
          className="flex-1 py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          style={{ color: '#ffffff', caretColor: '#c8ff00' }}
          placeholder="Search court or city…"
          value={query} onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 250)}
          autoComplete="off"
        />
        {searching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {query && !searching && <button type="button" onClick={clearLocation} className="shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}><X size={14} /></button>}
        <button type="button" onClick={detectGPS} disabled={gpsLoading}
          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: gpsLoading ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}>
          {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        </button>
      </div>
      {focused && suggestions.length > 0 && (
        <div className="mx-3 mb-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#13131f' }}>
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors">
              <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }} />
              <div>
                <p className="text-xs font-bold leading-tight" style={{ color: '#ffffff' }}>{s.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.secondary}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {(city || province) && (
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          {city && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: 'rgba(200,255,0,0.1)', color: '#c8ff00' }}>📍 {city}</span>}
          {province && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: 'rgba(200,255,0,0.06)', color: 'rgba(200,255,0,0.7)' }}>🗺️ {province}</span>}
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
    sport: 'badminton', court_name: '', city: '', province: '',
    result: 'win', score: '', intensity: 'Med', content: '',
  })

  // Opponent search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [opponentFocused, setOpponentFocused] = useState(false)

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [completedGame, setCompletedGame] = useState(null)

  async function searchOpponents(query) {
    if (!query || query.length < 2) return
    setIsSearching(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, city, province')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(6)
    if (error) console.error('Opponent search:', error)
    else setSearchResults(data || [])
    setIsSearching(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && !taggedUser) searchOpponents(searchQuery)
      else if (searchQuery.length === 0) setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, taggedUser])

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
      const fileToUpload = await compressImage(file)
      const ext = fileToUpload.type.startsWith('video') ? file.name.split('.').pop() : 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('openplay-media').upload(path, fileToUpload)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
        urls.push(publicUrl); types.push(fileToUpload.type.startsWith('video') ? 'video' : 'image')
      }
    }
    return { urls, types }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !user) return
    if (formData.result === 'win' && !taggedUser) {
      alert('⚠️ To record a WIN, you must tag your opponent. This keeps the rankings fair.')
      return
    }
    setLoading(true)
    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length ? await uploadMedia() : { urls: [], types: [] }
      const now = new Date().toISOString()

      // 1. Your game — ELO trigger fires automatically on INSERT
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([{
          user_id: user.id, sport: formData.sport, court_name: formData.court_name,
          city: formData.city, province: formData.province, result: formData.result,
          score: formData.score, intensity: formData.intensity,
          opponent_name: taggedUser ? taggedUser.username : searchQuery,
          tagged_opponent_id: taggedUser?.id || null, created_at: now,
        }])
        .select().single()
      if (gameError) throw gameError

      // 2. Opponent loss (syncs leaderboard + ELO)
      if (taggedUser && formData.result === 'win') {
        const { error: oppErr } = await supabase.from('games').insert([{
          user_id: taggedUser.id, sport: formData.sport, court_name: formData.court_name,
          city: formData.city, province: formData.province, result: 'loss',
          score: formData.score, intensity: formData.intensity,
          opponent_name: profile?.username || 'opponent',
          tagged_opponent_id: user.id, created_at: now,
        }])
        if (oppErr) console.error('Opponent sync failed:', oppErr)
      }

      // 3. Feed post
      const sport = SPORTS.find(s => s.id === formData.sport)
      const opponentLabel = taggedUser ? `@${taggedUser.username}` : searchQuery || 'Open Play'
      const autoContent = `${sport?.emoji} Just logged a ${sport?.label} match at ${formData.court_name || 'the courts'}. Result: ${formData.result.toUpperCase()} (${formData.score || '—'}). Vs: ${opponentLabel}`
      const { data: newPost, error: postError } = await supabase.from('posts').insert([{
        author_id: user.id, user_id: user.id,
        content: formData.content || autoContent, sport: formData.sport,
        location_name: formData.court_name, city: formData.city, province: formData.province,
        media_urls, media_types, game_id: game.id, inserted_at: now, created_at: now,
      }]).select().single()
      if (postError) console.warn('Feed post failed:', postError.message)

      // 4. Notifications
      const myUsername = profile?.username || 'user'
      if (taggedUser && formData.result === 'win') {
        await sendNotification({
          userId: taggedUser.id, type: 'tagged_match',
          title: `@${myUsername} recorded a match against you`,
          body: `${sport?.emoji} ${sport?.label} · A LOSS has been recorded. Score: ${formData.score || '—'}`,
          data: { from_username: myUsername, game_id: game.id, post_id: newPost?.id || null },
        }).catch(console.error)
      }
      if (formData.content?.includes('@') && newPost) {
        await notifyMentions({ text: formData.content.trim(), fromUser: { id: user.id, username: myUsername }, postId: newPost.id }).catch(console.error)
      }

      // 5. Show rating modal if opponent tagged, else navigate
      if (taggedUser) {
        setCompletedGame({ id: game.id, opponent: taggedUser })
        setShowRatingModal(true)
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('Error saving match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const showOpponentDropdown = opponentFocused && searchResults.length > 0 && !taggedUser

  return (
    <div className="min-h-screen pb-32" style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>

      {showRatingModal && completedGame && (
        <RatingModal
          gameId={completedGame.id}
          opponent={completedGame.opponent}
          onClose={() => { setShowRatingModal(false); navigate('/') }}
          onSkip={() => { setShowRatingModal(false); navigate('/') }}
        />
      )}

      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-8 rounded-full" style={{ background: '#c8ff00' }} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>Record Match</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#c8ff00', opacity: 0.7 }}>Sync your performance</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-5">

        {/* Sport */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORTS.map(s => (
            <button key={s.id} type="button" onClick={() => setFormData({ ...formData, sport: s.id })}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase border-2 transition-all duration-200"
              style={formData.sport === s.id
                ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.4)' }
                : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
              <span>{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Location */}
        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.8 }}>📍 Location</p>
          </div>
          <LocationSearch
            courtName={formData.court_name} city={formData.city} province={formData.province}
            onCourtChange={v => setFormData(f => ({ ...f, court_name: v }))}
            onCityChange={v => setFormData(f => ({ ...f, city: v }))}
            onProvinceChange={v => setFormData(f => ({ ...f, province: v }))}
          />
        </div>

        {/* Match details — NO overflow-hidden so dropdown is not clipped */}
        <div className="rounded-3xl border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>⚔️ Match Details</p>
          </div>

          {/* Opponent — relative wrapper for dropdown */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
              <Users size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
              <input
                className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
                style={{ color: taggedUser ? '#c8ff00' : '#ffffff', caretColor: '#c8ff00' }}
                placeholder="Tag opponent (username)"
                value={taggedUser
                  ? `@${taggedUser.username}${taggedUser.display_name ? ` · ${taggedUser.display_name}` : ''}`
                  : searchQuery}
                onChange={e => { setTaggedUser(null); setSearchQuery(e.target.value) }}
                onFocus={() => setOpponentFocused(true)}
                onBlur={() => setTimeout(() => setOpponentFocused(false), 200)}
              />
              {isSearching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
              {taggedUser && (
                <button type="button" onClick={() => { setTaggedUser(null); setSearchQuery(''); setSearchResults([]) }} style={{ color: '#ff4d4d' }}>
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Dropdown sits outside overflow-hidden via absolute positioning on the relative parent above the card */}
            {showOpponentDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mx-3 mt-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                style={{ background: '#1a1a2e' }}>
                {searchResults.map(u => (
                  <button key={u.id} type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      setTaggedUser(u); setSearchQuery(''); setSearchResults([]); setOpponentFocused(false)
                    }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-none hover:bg-white/10 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold" style={{ color: '#ffffff' }}>@{u.username}</span>
                      {u.display_name && <span className="text-xs" style={{ color: 'rgba(200,255,0,0.8)' }}>{u.display_name}</span>}
                    </div>
                    {(u.city || u.province) && (
                      <span className="text-xs shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>📍 {u.city || u.province}</span>
                    )}
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
              placeholder="Final score e.g. 21-18, 21-15"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: e.target.value })}
            />
          </div>

          {/* Caption */}
          <div className="px-4 py-3">
            <textarea
              className="w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
              style={{ color: '#ffffff', caretColor: '#c8ff00' }}
              placeholder="Add a caption (optional)…"
              rows={3} value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
        </div>

        {/* Result */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Result</p>
          <div className="grid grid-cols-2 gap-3">
            {['win', 'loss'].map(r => (
              <button key={r} type="button" onClick={() => setFormData({ ...formData, result: r })}
                className="py-5 rounded-[2rem] font-black uppercase italic tracking-tighter text-2xl border-2 transition-all duration-300"
                style={formData.result === r
                  ? r === 'win'
                    ? { borderColor: '#c8ff00', color: '#c8ff00', background: 'rgba(200,255,0,0.08)', boxShadow: '0 0 24px rgba(200,255,0,0.25)' }
                    : { borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255,77,77,0.08)', boxShadow: '0 0 24px rgba(255,77,77,0.2)' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)' }
                }>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          {formData.result === 'win' && !taggedUser && (
            <div className="mt-3 px-4 py-2.5 rounded-2xl flex items-center gap-2"
              style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)' }}>
              <span className="text-sm">⚠️</span>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(200,255,0,0.8)' }}>
                Wins require a tagged opponent to count in rankings
              </p>
            </div>
          )}
        </div>

        {/* Intensity */}
        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} style={{ color: '#c8ff00', opacity: 0.8 }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Intensity</p>
          </div>
          <div className="flex gap-2">
            {[
              { lvl: 'Low', active: { background: 'rgba(59,130,246,0.15)', borderColor: '#60a5fa', color: '#93c5fd' }, dot: '#60a5fa' },
              { lvl: 'Med', active: { background: 'rgba(234,179,8,0.15)', borderColor: '#facc15', color: '#fde68a' }, dot: '#facc15' },
              { lvl: 'High', active: { background: 'rgba(239,68,68,0.15)', borderColor: '#f87171', color: '#fca5a5' }, dot: '#f87171' },
            ].map(({ lvl, active, dot }) => (
              <button key={lvl} type="button" onClick={() => setFormData({ ...formData, intensity: lvl })}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 transition-all flex items-center justify-center gap-1.5"
                style={formData.intensity === lvl ? active : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: formData.intensity === lvl ? dot : 'rgba(255,255,255,0.2)' }} />
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Media */}
        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>📷 Photos / Video</p>
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mediaPreviews.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#ffffff' }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold border-2 border-dashed transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
            <Image size={15} /> Add Photos or Video
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full font-black py-6 rounded-[2.5rem] uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: loading ? 'rgba(200,255,0,0.5)' : '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 30px rgba(200,255,0,0.35)' }}>
          {loading ? <Loader2 className="animate-spin" /> : <><Share2 size={22} /> Sync Game</>}
        </button>
      </form>
    </div>
  )
}
