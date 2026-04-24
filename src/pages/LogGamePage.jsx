import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { notifyMentions, sendNotification } from '../hooks/useNotifications'
import { MapPin, Users, Search, Share2, Loader2, X, Image, Zap, Navigation } from 'lucide-react'
import PostGameShareCard from '../components/PostGameShareCard'

// ── Smart location search (Google Places Autocomplete) ──────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places)
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id    = 'gmap-script'
      script.src   = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`
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
      console.error("Places error", e)
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
    onProvinceChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 300)
  }

  async function pickSuggestion(s) {
    setQuery(s.name)
    onCourtChange(s.name)
    setSuggestions([])
    try {
      const place = new window.google.maps.places.Place({ id: s.placeId, requestedLanguage: 'en' })
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] })
      const comps = place.addressComponents || []
      let cityVal = '', provinceVal = ''
      const locality = comps.find(c =>
        c.types.includes('locality') ||
        c.types.includes('administrative_area_level_3') ||
        c.types.includes('sublocality_level_1') ||
        c.types.includes('sublocality')
      )
      const provinceComp = comps.find(c =>
        c.types.includes('administrative_area_level_2') ||
        c.types.includes('administrative_area_level_1')
      )
      cityVal     = locality?.longText     || locality?.long_name     || ''
      provinceVal = provinceComp?.longText || provinceComp?.long_name || ''
      if (!cityVal && s.secondary) {
        const parts = s.secondary.split(',').map(p => p.trim())
        cityVal     = parts[0] || ''
        provinceVal = parts[1] || provinceVal
      }
      if (!cityVal && place.formattedAddress) {
        const parts = place.formattedAddress.split(',').map(p => p.trim())
        if (parts.length >= 2) cityVal = parts[parts.length - 3] || parts[parts.length - 2] || ''
      }
      onCityChange(cityVal)
      onProvinceChange(provinceVal)
    } catch (err) {
      console.error('Place details error:', err)
      const parts = s.secondary.split(',').map(p => p.trim()).filter(Boolean)
      onCityChange(parts[0] || '')
      onProvinceChange(parts[1] || '')
    }
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }

  function clearLocation() {
    setQuery(''); onCourtChange(''); onCityChange(''); onProvinceChange(''); setSuggestions([])
  }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_KEY}`)
          const data = await res.json()
          if (!data.results?.length) { alert('Could not get location'); setGpsLoading(false); return }
          let name = '', cityVal = '', provinceVal = ''
          for (const result of data.results) {
            const c        = result.address_components
            const premise  = c.find(x => x.types.includes('premise'))
            const estab    = c.find(x => x.types.includes('establishment'))
            const poi      = c.find(x => x.types.includes('point_of_interest'))
            const route    = c.find(x => x.types.includes('route'))
            const locality = c.find(x => x.types.includes('locality'))
            const province = c.find(x => x.types.includes('administrative_area_level_2') || x.types.includes('administrative_area_level_1'))
            if (!name)        name        = premise?.long_name || estab?.long_name || poi?.long_name || route?.long_name || ''
            if (!cityVal)     cityVal     = locality?.long_name || ''
            if (!provinceVal) provinceVal = province?.long_name || ''
            if (name && cityVal) break
          }
          if (!name) name = data.results[0].formatted_address.split(',')[0].trim()
          setQuery(name)
          onCourtChange(name)
          onCityChange(cityVal)
          onProvinceChange(provinceVal)
        } catch { alert('Could not get location') }
        finally  { setGpsLoading(false) }
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) alert('Location access denied. Please enable location in your browser settings.')
        else if (err.code === 2) alert('Location unavailable. Try again.')
        else alert('Location request timed out. Try again.')
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
                <p className="text-xs font-bold text-white leading-tight">{s.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.secondary}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {(city || province) && (
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          {city && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
              style={{ background: 'rgba(200,255,0,0.1)', color: '#c8ff00' }}>
              📍 {city}
            </span>
          )}
          {province && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
              style={{ background: 'rgba(200,255,0,0.06)', color: 'rgba(200,255,0,0.7)' }}>
              🗺️ {province}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Opponent search sub-component ─────────────────────────────────────────────
function OpponentSearch({ user, taggedUser, setTaggedUser }) {
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching]   = useState(false)

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    // ✅ FIXED: query `users` table with `display_name` (not `profiles` / `full_name`)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, city, avatar_url, avatar_type')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .limit(6)
    if (!error) setSearchResults(data || [])
    setIsSearching(false)
  }, [user.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && !taggedUser) search(searchQuery)
      else if (!searchQuery) setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, taggedUser, search])

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <Users size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
        <input
          className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          style={{ color: taggedUser ? '#c8ff00' : '#ffffff', caretColor: '#c8ff00' }}
          placeholder="Tag opponent (username)"
          value={taggedUser ? `@${taggedUser.username}` : searchQuery}
          onChange={e => {
            setTaggedUser(null)
            setSearchQuery(e.target.value)
            setSearchResults([])
          }}
        />
        {isSearching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {taggedUser && (
          <button type="button"
            onClick={() => { setTaggedUser(null); setSearchQuery(''); setSearchResults([]) }}
            className="shrink-0 text-red-400">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Tagged user avatar preview */}
      {taggedUser && (
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
            {taggedUser.avatar_url && taggedUser.avatar_type !== 'initials' ? (
              <img src={taggedUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-black"
                style={{ background: '#C8FF00', color: '#0a0a0f' }}>
                {taggedUser.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black" style={{ color: '#c8ff00' }}>
            @{taggedUser.username} tagged
          </span>
        </div>
      )}

      {searchResults.length > 0 && !taggedUser && (
        <div className="absolute z-50 w-full mt-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: '#1a1a2e' }}>
          {searchResults.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setTaggedUser(u)
                setSearchQuery('')
                setSearchResults([])
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-none transition-colors hover:bg-white/10"
            >
              {/* Avatar in dropdown */}
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                {u.avatar_url && u.avatar_type !== 'initials' ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-black"
                    style={{ background: '#C8FF00', color: '#0a0a0f' }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white text-sm">@{u.username}</span>
                {u.display_name && u.display_name !== u.username && (
                  <span className="text-xs ml-2" style={{ color: 'rgba(200,255,0,0.7)' }}>
                    {u.display_name}
                  </span>
                )}
                {u.city && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    📍 {u.city}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LogGamePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading]         = useState(false)
  const [mediaFiles, setMediaFiles]   = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    sport:      'badminton',
    court_name: '',
    city:       '',
    province:   '',
    result:     'win',
    score:      '',
    intensity:  'Med',
    content:    '',
  })

  const [taggedUser, setTaggedUser] = useState(null)

  // Post-game share card state
  const [shareCardData, setShareCardData] = useState(null)

  function handleMediaSelect(e) {
    const files = Array.from(e.target.files)
    setMediaFiles(prev => [...prev, ...files].slice(0, 6))
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setMediaPreviews(prev => [...prev, {
        url, type: file.type.startsWith('video') ? 'video' : 'image'
      }])
    })
  }

  function removeMedia(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadMedia() {
    const urls = [], types = []
    for (const file of mediaFiles) {
      const ext  = file.name.split('.').pop()
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

    if (formData.result === 'win' && !taggedUser) {
      alert('⚠️ To record a WIN, you must tag your opponent. This keeps the rankings fair.')
      return
    }

    setLoading(true)

    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length
        ? await uploadMedia()
        : { urls: [], types: [] }

      // ── 1. Insert your game ──────────────────────────────────────────────
      const { data: game, error: gameError } = await supabase.from('games').insert([{
        user_id:            user.id,
        sport:              formData.sport,
        court_name:         formData.court_name,
        city:               formData.city,
        province:           formData.province,
        result:             formData.result,
        score:              formData.score,
        intensity:          formData.intensity,
        opponent_name:      taggedUser ? taggedUser.username : '',
        tagged_opponent_id: taggedUser?.id || null,
        created_at:         new Date().toISOString(),
      }]).select().single()

      if (gameError) throw gameError

      // ── 2. Insert opponent's mirror loss ────────────────────────────────
      if (taggedUser && formData.result === 'win') {
        const { error: opponentError } = await supabase.from('games').insert([{
          user_id:            taggedUser.id,
          sport:              formData.sport,
          court_name:         formData.court_name,
          city:               formData.city,
          province:           formData.province,
          result:             'loss',
          score:              formData.score,
          intensity:          formData.intensity,
          opponent_name:      profile?.username || 'opponent',
          tagged_opponent_id: user.id,
          created_at:         new Date().toISOString(),
        }])
        if (opponentError) console.error('Opponent sync failed:', opponentError)
      }

      // ── 3. Create feed post ──────────────────────────────────────────────
      const sport    = SPORTS.find(s => s.id === formData.sport)
      const opponent = taggedUser ? `@${taggedUser.username}` : 'Open Play'
      const autoContent = `${sport?.emoji} Just logged a ${sport?.label} match${formData.court_name ? ` at ${formData.court_name}` : ''}. Result: ${formData.result.toUpperCase()}${formData.score ? ` (${formData.score})` : ''}. Vs: ${opponent}`

      const { data: newPost, error: postError } = await supabase.from('posts').insert([{
        author_id:     user.id,
        user_id:       user.id,
        content:       formData.content || autoContent,
        sport:         formData.sport,
        location_name: formData.court_name,
        city:          formData.city,
        province:      formData.province,
        media_urls,
        media_types,
        game_id:       game.id,
        inserted_at:   new Date().toISOString(),
      }]).select().single()

      if (postError) console.warn('Feed post failed:', postError.message)

      // ── 4. Notifications ─────────────────────────────────────────────────
      const myUsername = profile?.username || 'user'
      if (taggedUser && formData.result === 'win') {
        await sendNotification({
          userId: taggedUser.id,
          type:   'tagged_match',
          title:  `@${myUsername} recorded a match against you`,
          body:   `${sport?.emoji} ${sport?.label} · A LOSS has been recorded on your profile. Score: ${formData.score || '—'}`,
          data:   { from_username: myUsername, game_id: game.id, post_id: newPost?.id || null },
        }).catch(err => console.error('Notification error:', err))
      }
      const caption = formData.content.trim()
      if (caption.includes('@') && newPost) {
        await notifyMentions({
          text:     caption,
          fromUser: { id: user.id, username: myUsername },
          postId:   newPost.id,
        }).catch(err => console.error('Mention notification error:', err))
      }

      // ── 5. Fetch fresh stats for share card ──────────────────────────────
      const { data: allGames } = await supabase
        .from('games')
        .select('result')
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      const totalGames = allGames?.length || 0
      const totalWins  = allGames?.filter(g => g.result === 'win').length || 0
      const winRate    = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

      // Fetch opponent profile for share card avatar
      let opponentProfile = null
      if (taggedUser) {
        const { data: oppData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, avatar_type, elo_rating')
          .eq('id', taggedUser.id)
          .single()
        opponentProfile = oppData
      }

      // Fetch ELO from elo_history (latest entry for this user)
      const { data: eloRow } = await supabase
        .from('elo_history')
        .select('new_elo, elo_change')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // ── 6. Show share card ────────────────────────────────────────────────
      setShareCardData({
        result:          formData.result,
        score:           formData.score,
        sport:           formData.sport,
        myProfile:       profile,
        opponentProfile,
        opponentName:    taggedUser?.username || null,
        eloGained:       eloRow?.elo_change  ?? null,
        eloCurrent:      eloRow?.new_elo     ?? null,
        winRate,
        totalWins,
        totalGames,
        courtName:       formData.court_name,
        city:            formData.city,
      })

    } catch (err) {
      console.error('Submit error:', err)
      alert('Error saving match: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen pb-32"
        style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>

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

          {/* Sport selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SPORTS.map(s => (
              <button key={s.id} type="button"
                onClick={() => setFormData({ ...formData, sport: s.id })}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase border-2 transition-all duration-200"
                style={formData.sport === s.id
                  ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.4)' }
                  : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }
                }>
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Location */}
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="px-4 pt-4 pb-2 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.8 }}>📍 Location</p>
            </div>
            <LocationSearch
              courtName={formData.court_name}
              city={formData.city}
              province={formData.province}
              onCourtChange={v => setFormData(f => ({ ...f, court_name: v }))}
              onCityChange={v  => setFormData(f => ({ ...f, city: v }))}
              onProvinceChange={v => setFormData(f => ({ ...f, province: v }))}
            />
          </div>

          {/* Match details */}
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="px-4 pt-4 pb-2 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>⚔️ Match Details</p>
            </div>

            {/* ── Opponent search (fixed: uses users / display_name) ── */}
            <OpponentSearch
              user={user}
              taggedUser={taggedUser}
              setTaggedUser={setTaggedUser}
            />

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
                placeholder="Add a caption (optional)..."
                rows={3}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>

          {/* Result */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Result</p>
            <div className="grid grid-cols-2 gap-3">
              {['win', 'loss'].map(r => (
                <button key={r} type="button"
                  onClick={() => setFormData({ ...formData, result: r })}
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
                { lvl: 'Low',  active: { background: 'rgba(59,130,246,0.15)', borderColor: '#60a5fa', color: '#93c5fd' }, dot: '#60a5fa' },
                { lvl: 'Med',  active: { background: 'rgba(234,179,8,0.15)',  borderColor: '#facc15', color: '#fde68a' }, dot: '#facc15' },
                { lvl: 'High', active: { background: 'rgba(239,68,68,0.15)',  borderColor: '#f87171', color: '#fca5a5' }, dot: '#f87171' },
              ].map(({ lvl, active, dot }) => (
                <button key={lvl} type="button"
                  onClick={() => setFormData({ ...formData, intensity: lvl })}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 transition-all flex items-center justify-center gap-1.5"
                  style={formData.intensity === lvl
                    ? active
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }
                  }>
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: formData.intensity === lvl ? dot : 'rgba(255,255,255,0.2)' }} />
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
                    {m.type === 'video'
                      ? <video src={m.url} className="w-full h-full object-cover" />
                      : <img src={m.url} alt="" className="w-full h-full object-cover" />
                    }
                    <button type="button" onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
                      style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold border-2 border-dashed transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
              <Image size={15} />
              Add Photos or Video
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full font-black py-6 rounded-[2.5rem] uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: loading ? 'rgba(200,255,0,0.5)' : '#c8ff00',
              color: '#0a0a0f',
              boxShadow: '0 0 30px rgba(200,255,0,0.35)',
            }}>
            {loading ? <Loader2 className="animate-spin" /> : <><Share2 size={22} /> Sync Game</>}
          </button>
        </form>
      </div>

      {/* Post-game share card modal */}
      {shareCardData && (
        <PostGameShareCard
          data={shareCardData}
          onClose={() => {
            setShareCardData(null)
            navigate('/')
          }}
        />
      )}
    </>
  )
}
