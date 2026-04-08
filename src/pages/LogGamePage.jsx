import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { notifyMentions, sendNotification } from '../hooks/useNotifications'
import { MapPin, Users, Search, Share2, Loader2, X, Image, Zap, Navigation } from 'lucide-react'
import RatingModal from '../components/RatingModal'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places)
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'gmap-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`
      script.async = true; script.defer = true
      document.head.appendChild(script)
    }
    const poll = setInterval(() => {
      if (window.google?.maps?.places) { setReady(true); clearInterval(poll) }
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
    if (mapsReady) sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
  }, [mapsReady])

  async function searchPlaces(q) {
    if (q.length < 2 || !mapsReady) { setSuggestions([]); return }
    setSearching(true)
    try {
      const result = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken: sessionTokenRef.current, includedRegionCodes: ['ph'],
      })
      setSuggestions((result.suggestions || []).map(s => {
        const p = s.placePrediction
        return { placeId: p.placeId, name: p.mainText?.text || '', secondary: p.secondaryText?.text || '' }
      }))
    } catch { setSuggestions([]) }
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
      await place.fetchFields({ fields: ['addressComponents'] })
      const comps = place.addressComponents || []
      const locality = comps.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3'))
      const prov     = comps.find(c => c.types.includes('administrative_area_level_2') || c.types.includes('administrative_area_level_1'))
      onCityChange(locality?.longText || ''); onProvinceChange(prov?.longText || '')
    } catch {
      const parts = s.secondary.split(',').map(p => p.trim())
      onCityChange(parts[0] || ''); onProvinceChange(parts[1] || '')
    }
    if (window.google?.maps?.places) sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
  }

  function clearAll() { setQuery(''); onCourtChange(''); onCityChange(''); onProvinceChange(''); setSuggestions([]) }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_KEY}`)
          const data = await res.json()
          if (!data.results?.length) { setGpsLoading(false); return }
          let name = '', cityVal = '', provVal = ''
          for (const r of data.results) {
            const c = r.address_components
            if (!name) name = c.find(x => x.types.includes('premise') || x.types.includes('establishment'))?.long_name || ''
            if (!cityVal) cityVal = c.find(x => x.types.includes('locality'))?.long_name || ''
            if (!provVal)  provVal  = c.find(x => x.types.includes('administrative_area_level_2') || x.types.includes('administrative_area_level_1'))?.long_name || ''
            if (name && cityVal) break
          }
          if (!name) name = data.results[0].formatted_address.split(',')[0].trim()
          setQuery(name); onCourtChange(name); onCityChange(cityVal); onProvinceChange(provVal)
        } catch { alert('Could not get location') }
        finally { setGpsLoading(false) }
      },
      () => { setGpsLoading(false); alert('Location access denied.') },
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
          placeholder="Search court or city…" value={query}
          onChange={handleInput} onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)} autoComplete="off" />
        {searching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {query && !searching && (
          <button type="button" onClick={clearAll} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={14} /></button>
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
                <p className="text-xs font-bold" style={{ color: '#ffffff' }}>{s.name}</p>
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

function OpponentSearch({ taggedUser, searchQuery, onTag, onClear, onQueryChange }) {
  const [results, setResults]         = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [focused, setFocused]         = useState(false)
  const debounceRef                   = useRef(null)
  const { user }                      = useAuth()

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    setIsSearching(true)
    const { data } = await supabase.from('users')
      .select('id, username, display_name, city, avatar_url, avatar_type')
      .ilike('username', `%${q}%`)
      .neq('id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .limit(6)
    setResults(data || [])
    setIsSearching(false)
  }, [user?.id])

  useEffect(() => {
    if (taggedUser) return
    clearTimeout(debounceRef.current)
    if (searchQuery.length >= 2) debounceRef.current = setTimeout(() => doSearch(searchQuery), 300)
    else setResults([])
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, taggedUser, doSearch])

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <Users size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
        <input
          className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          style={{ color: taggedUser ? '#c8ff00' : '#ffffff', caretColor: '#c8ff00' }}
          placeholder="Tag opponent (username)"
          value={taggedUser ? `@${taggedUser.username}` : searchQuery}
          onChange={e => { if (taggedUser) return; onQueryChange(e.target.value) }}
          onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
          readOnly={!!taggedUser} />
        {isSearching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {taggedUser && <button type="button" onClick={onClear} style={{ color: '#ff6b6b' }}><X size={15} /></button>}
      </div>
      {taggedUser && (
        <div className="px-4 pb-2 pt-1 flex items-center gap-2">
          <div className="w-5 h-5 rounded-md overflow-hidden shrink-0">
            {taggedUser.avatar_url && taggedUser.avatar_type !== 'initials'
              ? <img src={taggedUser.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'rgba(200,255,0,0.2)', color: '#c8ff00' }}>{taggedUser.username.charAt(0).toUpperCase()}</div>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8ff00' }}>{taggedUser.display_name || taggedUser.username}</span>
          {taggedUser.city && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>📍 {taggedUser.city}</span>}
        </div>
      )}
      {focused && !taggedUser && results.length > 0 && (
        <div className="absolute z-50 w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#1a1a2e', top: '100%', left: 0 }}>
          {results.map(u => (
            <button key={u.id} type="button"
              onMouseDown={e => { e.preventDefault(); onTag(u); setResults([]); setFocused(false) }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-none hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                {u.avatar_url && u.avatar_type !== 'initials'
                  ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(200,255,0,0.15)', color: '#c8ff00' }}>{u.username.charAt(0).toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: '#ffffff' }}>@{u.username}</p>
                {u.display_name && u.display_name !== u.username && <p className="text-xs truncate" style={{ color: 'rgba(200,255,0,0.7)' }}>{u.display_name}</p>}
              </div>
              {u.city && <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>📍 {u.city}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ELO engine ───────────────────────────────────────────────────────────────
function getSkillTier(elo) {
  if (elo >= 1800) return 'Diamond'
  if (elo >= 1500) return 'Platinum'
  if (elo >= 1300) return 'Gold'
  if (elo >= 1100) return 'Silver'
  return 'Bronze'
}

async function ensureEloRecord(userId, sport) {
  const { data } = await supabase
    .from('player_elo')
    .select('id, elo_rating, wins, losses, matches_played')
    .eq('user_id', userId)
    .eq('sport', sport)
    .maybeSingle()

  if (data) return data

  const { data: created, error } = await supabase
    .from('player_elo')
    .insert({ user_id: userId, sport, elo_rating: 1000, wins: 0, losses: 0, matches_played: 0, skill_tier: 'Bronze' })
    .select('id, elo_rating, wins, losses, matches_played')
    .single()

  if (error) {
    const { data: retry } = await supabase
      .from('player_elo')
      .select('id, elo_rating, wins, losses, matches_played')
      .eq('user_id', userId)
      .eq('sport', sport)
      .maybeSingle()
    return retry || { elo_rating: 1000, wins: 0, losses: 0, matches_played: 0 }
  }
  return created
}

async function processMatchEloLocal({ sport, winnerId, loserId }) {
  try {
    const [wRec, lRec] = await Promise.all([
      ensureEloRecord(winnerId, sport),
      ensureEloRecord(loserId, sport),
    ])

    const wElo = wRec.elo_rating ?? 1000
    const lElo = lRec.elo_rating ?? 1000
    const wM   = wRec.matches_played ?? 0
    const lM   = lRec.matches_played ?? 0

    const kW = wM < 20 ? 32 : wM < 50 ? 24 : 16
    const kL = lM < 20 ? 32 : lM < 50 ? 24 : 16

    const expW = 1 / (1 + Math.pow(10, (lElo - wElo) / 400))
    const expL = 1 - expW

    const deltaW = Math.round(kW * (1 - expW))
    const deltaL = Math.round(kL * (0 - expL))

    const newWElo = Math.max(100, wElo + deltaW)
    const newLElo = Math.max(100, lElo + deltaL)

    const now = new Date().toISOString()

    const [r1, r2] = await Promise.all([
      supabase.from('player_elo')
        .update({ elo_rating: newWElo, wins: (wRec.wins ?? 0) + 1, losses: wRec.losses ?? 0, matches_played: wM + 1, skill_tier: getSkillTier(newWElo), updated_at: now })
        .eq('user_id', winnerId).eq('sport', sport),
      supabase.from('player_elo')
        .update({ elo_rating: newLElo, wins: lRec.wins ?? 0, losses: (lRec.losses ?? 0) + 1, matches_played: lM + 1, skill_tier: getSkillTier(newLElo), updated_at: now })
        .eq('user_id', loserId).eq('sport', sport),
    ])

    if (r1.error) console.error('ELO winner update:', r1.error.message)
    if (r2.error) console.error('ELO loser update:',  r2.error.message)

    await Promise.all([
      supabase.from('users').update({ elo_rating: newWElo, skill_tier: getSkillTier(newWElo) }).eq('id', winnerId),
      supabase.from('users').update({ elo_rating: newLElo, skill_tier: getSkillTier(newLElo) }).eq('id', loserId),
    ])

    console.log(`✅ ELO: ${wElo}→${newWElo} (+${deltaW}) | ${lElo}→${newLElo} (${deltaL})`)
    return { success: true, deltaW, deltaL, newWElo, newLElo }
  } catch (err) {
    console.error('processMatchEloLocal failed:', err)
    return { success: false }
  }
}

// ── Rating helper ─────────────────────────────────────────────────────────────
async function submitOpponentRating({ rateeId, ratings }) {
  try {
    const { data: u } = await supabase
      .from('users')
      .select('avg_skill, avg_sportsmanship, avg_reliability, rating_count')
      .eq('id', rateeId)
      .maybeSingle()

    const n = (u?.rating_count ?? 0)
    await supabase.from('users').update({
      avg_skill:         (((u?.avg_skill         ?? 0) * n) + (ratings.skill         ?? 3)) / (n + 1),
      avg_sportsmanship: (((u?.avg_sportsmanship ?? 0) * n) + (ratings.sportsmanship ?? 3)) / (n + 1),
      avg_reliability:   (((u?.avg_reliability   ?? 0) * n) + (ratings.reliability  ?? 3)) / (n + 1),
      rating_count:      n + 1,
    }).eq('id', rateeId)
    console.log('✅ Rating submitted:', ratings)
  } catch (err) { console.error('submitOpponentRating:', err) }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LogGamePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading]             = useState(false)
  const [mediaFiles, setMediaFiles]       = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const fileInputRef                      = useRef(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingTarget, setRatingTarget]       = useState(null)

  const [formData, setFormData] = useState({
    sport: 'badminton', court_name: '', city: '', province: '',
    result: 'win', score: '', intensity: 'Med', content: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [taggedUser, setTaggedUser]   = useState(null)

  function handleMediaSelect(e) {
    const files = Array.from(e.target.files)
    setMediaFiles(p => [...p, ...files].slice(0, 6))
    files.forEach(f => setMediaPreviews(p => [...p, { url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' }]))
  }
  function removeMedia(i) {
    setMediaFiles(p => p.filter((_, idx) => idx !== i))
    setMediaPreviews(p => p.filter((_, idx) => idx !== i))
  }

  async function uploadMedia() {
    const urls = [], types = []
    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('openplay-media').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
        urls.push(publicUrl); types.push(file.type.startsWith('video') ? 'video' : 'image')
      }
    }
    return { urls, types }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !user) return
    if (formData.result === 'win' && !taggedUser) {
      alert('⚠️ To record a WIN, you must tag your opponent.')
      return
    }
    setLoading(true)
    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length ? await uploadMedia() : { urls: [], types: [] }

      // 1. MY GAME
      const { data: game, error: gErr } = await supabase.from('games').insert([{
        user_id: user.id, sport: formData.sport, court_name: formData.court_name,
        city: formData.city, province: formData.province, result: formData.result,
        score: formData.score, intensity: formData.intensity,
        opponent_name: taggedUser ? taggedUser.username : searchQuery,
        tagged_opponent_id: taggedUser?.id || null,
        created_at: new Date().toISOString(),
      }]).select().single()
      if (gErr) throw gErr

      // 2. OPPONENT'S GAME (CRITICAL FIX)
      if (taggedUser && formData.result === 'win') {
        console.log('🔄 Recording opponent loss for:', taggedUser.username)
        
        const opponentGameData = {
          user_id: taggedUser.id,
          sport: formData.sport,
          court_name: formData.court_name,
          city: formData.city,
          province: formData.province,
          result: 'loss',
          score: formData.score,
          intensity: formData.intensity,
          opponent_name: profile?.username || user.email?.split('@')[0] || 'opponent',
          tagged_opponent_id: user.id,
          created_at: new Date().toISOString(),
        }
        
        const { error: opponentError } = await supabase
          .from('games')
          .insert([opponentGameData])
        
        if (opponentError) {
          console.error('❌ Opponent sync FAILED:', opponentError)
        } else {
          console.log('✅ Opponent loss recorded')
        }
      }

      // 3. ELO update
      if (taggedUser) {
        const winnerId = formData.result === 'win' ? user.id : taggedUser.id
        const loserId  = formData.result === 'win' ? taggedUser.id : user.id
        await processMatchEloLocal({ sport: formData.sport, winnerId, loserId })
      }

      // 4. Feed post
      const sObj = SPORTS.find(s => s.id === formData.sport)
      const opp  = taggedUser ? `@${taggedUser.username}` : searchQuery || 'Open Play'
      const { data: newPost } = await supabase.from('posts').insert([{
        author_id: user.id, user_id: user.id,
        content: formData.content || `${sObj?.emoji} ${sObj?.label} match at ${formData.court_name || 'the courts'} — ${formData.result.toUpperCase()} (${formData.score || '—'}) vs ${opp}`,
        sport: formData.sport, location_name: formData.court_name,
        city: formData.city, province: formData.province,
        media_urls, media_types, game_id: game.id,
        inserted_at: new Date().toISOString(),
      }]).select().single()

      // 5. Notifications
      const myU = profile?.username || 'user'
      if (taggedUser && formData.result === 'win') {
        await sendNotification({
          userId: taggedUser.id, type: 'tagged_match',
          title: `@${myU} recorded a match against you`,
          body: `${sObj?.emoji} ${sObj?.label} — LOSS recorded. Score: ${formData.score || '—'}`,
          data: { from_username: myU, game_id: game.id, post_id: newPost?.id || null },
        }).catch(console.error)
      }
      if (formData.content.includes('@') && newPost) {
        await notifyMentions({ text: formData.content.trim(), fromUser: { id: user.id, username: myU }, postId: newPost.id }).catch(console.error)
      }

      // 6. Done
      if (taggedUser) {
        setRatingTarget({ id: taggedUser.id, username: taggedUser.username })
        setShowRatingModal(true)
      } else {
        alert('✅ Match recorded!')
        navigate('/')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-8 rounded-full" style={{ background: '#c8ff00' }} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>Record Match</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest ml-4" style={{ color: '#c8ff00', opacity: 0.7 }}>Sync your performance</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORTS.map(s => (
            <button key={s.id} type="button" onClick={() => setFormData({ ...formData, sport: s.id })}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase border-2 transition-all duration-200"
              style={formData.sport === s.id
                ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.4)' }
                : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.8 }}>📍 Location</p>
          </div>
          <LocationSearch
            courtName={formData.court_name} city={formData.city} province={formData.province}
            onCourtChange={v => setFormData(f => ({ ...f, court_name: v }))}
            onCityChange={v   => setFormData(f => ({ ...f, city: v }))}
            onProvinceChange={v => setFormData(f => ({ ...f, province: v }))} />
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>⚔️ Match Details</p>
          </div>
          <OpponentSearch taggedUser={taggedUser} searchQuery={searchQuery}
            onTag={u => { setTaggedUser(u); setSearchQuery('') }}
            onClear={() => { setTaggedUser(null); setSearchQuery('') }}
            onQueryChange={setSearchQuery} />
          <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
            <Search size={15} style={{ color: 'rgba(255,255,255,0.4)' }} className="shrink-0" />
            <input className="w-full py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
              style={{ color: '#ffffff', caretColor: '#c8ff00' }}
              placeholder="Final score e.g. 21-18, 21-15"
              value={formData.score} onChange={e => setFormData({ ...formData, score: e.target.value })} />
          </div>
          <div className="px-4 py-3">
            <textarea className="w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
              style={{ color: '#ffffff', caretColor: '#c8ff00' }}
              placeholder="Add a caption (optional)..." rows={3}
              value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Result</p>
          <div className="grid grid-cols-2 gap-3">
            {['win', 'loss'].map(r => (
              <button key={r} type="button" onClick={() => setFormData({ ...formData, result: r })}
                className="py-5 rounded-[2rem] font-black uppercase italic tracking-tighter text-2xl border-2 transition-all duration-300"
                style={formData.result === r ? (
                  r === 'win'
                    ? { borderColor: '#c8ff00', color: '#c8ff00', background: 'rgba(200,255,0,0.08)', boxShadow: '0 0 20px rgba(200,255,0,0.25)' }
                    : { borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255,77,77,0.08)', boxShadow: '0 0 20px rgba(255,77,77,0.2)' }
                ) : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          {formData.result === 'win' && !taggedUser && (
            <div className="mt-3 px-4 py-2.5 rounded-2xl flex items-center gap-2"
              style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)' }}>
              <span>⚠️</span>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(200,255,0,0.8)' }}>Wins require a tagged opponent to count in rankings</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} style={{ color: '#c8ff00', opacity: 0.8 }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Intensity</p>
          </div>
          <div className="flex gap-2">
            {[
              { lvl: 'Low',  active: { background: 'rgba(59,130,246,0.15)', borderColor: '#60a5fa', color: '#93c5fd' } },
              { lvl: 'Med',  active: { background: 'rgba(234,179,8,0.15)',  borderColor: '#facc15', color: '#fde68a' } },
              { lvl: 'High', active: { background: 'rgba(239,68,68,0.15)',  borderColor: '#f87171', color: '#fca5a5' } },
            ].map(({ lvl, active }) => (
              <button key={lvl} type="button" onClick={() => setFormData({ ...formData, intensity: lvl })}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 transition-all"
                style={formData.intensity === lvl ? active : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>📷 Photos / Video</p>
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mediaPreviews.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold border-2 border-dashed"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
            <Image size={15} /> Add Photos or Video
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full font-black py-6 rounded-[2.5rem] uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: loading ? 'rgba(200,255,0,0.5)' : '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 30px rgba(200,255,0,0.35)' }}>
          {loading ? <Loader2 className="animate-spin" /> : <><Share2 size={22} /> Sync Game</>}
        </button>
      </form>

      {showRatingModal && ratingTarget && (
        <RatingModal opponent={ratingTarget.username}
          onSubmit={async (ratings) => {
            if (ratingTarget && user) await submitOpponentRating({ rateeId: ratingTarget.id, ratings })
            setShowRatingModal(false)
            alert('✅ Match recorded and opponent rated!')
            navigate('/')
          }}
          onSkip={() => { setShowRatingModal(false); alert('✅ Match recorded!'); navigate('/') }}
        />
      )}
    </div>
  )
}