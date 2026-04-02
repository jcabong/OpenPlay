import { useState, useEffect, useRef } from 'react'
import { supabase, SPORTS, REGIONS, CITIES_BY_REGION } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Search, Share2, Loader2, Check, X, Image, Video, ChevronDown } from 'lucide-react'

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    sport: 'badminton',
    court_name: '',
    region: '',
    city: '',
    result: 'win',
    score: '',
    intensity: 'Med',
    content: '',
  })

  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser]     = useState(null)
  const [isSearching, setIsSearching]   = useState(false)

  const cities = formData.region ? (CITIES_BY_REGION[formData.region] || []) : []

  // Debounced opponent search
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
    const urls = []
    const types = []
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
    setLoading(true)

    try {
      // 1. Upload media if any
      const { urls: media_urls, types: media_types } = mediaFiles.length
        ? await uploadMedia()
        : { urls: [], types: [] }

      // 2. Save game
      const { data: game, error: gameError } = await supabase.from('games').insert([{
        user_id:            user.id,
        sport:              formData.sport,
        court_name:         formData.court_name,
        city:               formData.city,
        region:             formData.region,
        result:             formData.result,
        score:              formData.score,
        intensity:          formData.intensity,
        opponent_name:      taggedUser ? taggedUser.username : searchQuery,
        tagged_opponent_id: taggedUser?.id || null,
        created_at:         new Date().toISOString(),
      }]).select().single()

      if (gameError) throw gameError

      // 3. Create post for the feed
      const sport    = SPORTS.find(s => s.id === formData.sport)
      const opponent = taggedUser ? `@${taggedUser.username}` : searchQuery || 'Open Play'
      const autoContent = `${sport?.emoji} Just logged a ${sport?.label} match at ${formData.court_name || 'the courts'}. Result: ${formData.result.toUpperCase()} (${formData.score || '—'}). Vs: ${opponent}`

      const { error: postError } = await supabase.from('posts').insert([{
        user_id:       user.id,
        content:       formData.content || autoContent,
        sport:         formData.sport,
        location_name: formData.court_name,
        city:          formData.city,
        region:        formData.region,
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
    <div className="min-h-screen bg-ink-900 text-ink-50 p-5 pb-28">
      <header className="mb-8 pt-10">
        <h1 className="text-3xl font-display font-bold italic uppercase tracking-tighter text-white">Record Match</h1>
        <p className="text-accent text-[9px] font-black uppercase tracking-widest mt-1">Sync your performance</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Sport selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFormData({ ...formData, sport: s.id })}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${
                formData.sport === s.id
                  ? 'bg-accent text-ink-900 border-accent glow-accent scale-105'
                  : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Main details */}
        <div className="glass p-5 rounded-[2.5rem] border border-white/10 space-y-3 bg-gradient-to-br from-white/5 to-transparent">

          {/* Court */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <MapPin size={16} className="text-ink-600 shrink-0" />
            <input
              className="bg-transparent border-none w-full py-3.5 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Court / Venue name"
              value={formData.court_name}
              onChange={e => setFormData({ ...formData, court_name: e.target.value })}
              required
            />
          </div>

          {/* Region */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <ChevronDown size={16} className="text-ink-600 shrink-0" />
            <select
              className="bg-transparent border-none w-full py-3.5 text-sm text-white focus:ring-0 appearance-none"
              value={formData.region}
              onChange={e => setFormData({ ...formData, region: e.target.value, city: '' })}
              required
            >
              <option value="" className="bg-ink-900">Select Region...</option>
              {REGIONS.map(r => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
            </select>
          </div>

          {/* City */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <ChevronDown size={16} className="text-ink-600 shrink-0" />
            <select
              className="bg-transparent border-none w-full py-3.5 text-sm text-white focus:ring-0 appearance-none disabled:opacity-40"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              disabled={!formData.region}
              required
            >
              <option value="" className="bg-ink-900">Select City / Municipality...</option>
              {cities.map(c => <option key={c} value={c} className="bg-ink-900">{c}</option>)}
            </select>
          </div>

          {/* Opponent tag */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
              <Users size={16} className={`shrink-0 ${taggedUser ? 'text-accent' : 'text-ink-600'}`} />
              <input
                className="bg-transparent border-none w-full py-3.5 text-sm text-white focus:ring-0 placeholder:text-ink-700"
                placeholder="Tag opponent (username)"
                value={taggedUser ? `@${taggedUser.username}` : searchQuery}
                onChange={e => { setTaggedUser(null); setSearchQuery(e.target.value) }}
              />
              {isSearching && <Loader2 size={13} className="animate-spin text-ink-600 shrink-0" />}
              {taggedUser && (
                <button type="button" onClick={() => { setTaggedUser(null); setSearchQuery('') }} className="text-spark">
                  <X size={15} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && !taggedUser && (
              <div className="absolute z-50 w-full mt-2 bg-ink-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setTaggedUser(u); setSearchResults([]) }}
                    className="w-full text-left px-4 py-3 text-sm text-ink-100 hover:bg-accent hover:text-ink-900 transition-colors flex items-center justify-between border-b border-white/5 last:border-none"
                  >
                    <span>@{u.username}</span>
                    <span className="text-[10px] text-ink-500">{u.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <Search size={16} className="text-ink-600 shrink-0" />
            <input
              className="bg-transparent border-none w-full py-3.5 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Final score (e.g. 21-18, 21-15)"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: e.target.value })}
            />
          </div>

          {/* Caption */}
          <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/5 focus-within:border-accent/50 transition-colors">
            <textarea
              className="bg-transparent border-none w-full text-sm text-white focus:ring-0 placeholder:text-ink-700 resize-none"
              placeholder="Add a caption (optional)..."
              rows={3}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
        </div>

        {/* Result */}
        <div className="grid grid-cols-2 gap-3">
          {['win', 'loss'].map(res => (
            <button
              key={res}
              type="button"
              onClick={() => setFormData({ ...formData, result: res })}
              className={`py-5 rounded-[2rem] font-display font-bold uppercase italic border-2 transition-all duration-300 tracking-tighter text-xl ${
                formData.result === res
                  ? res === 'win'
                    ? 'border-accent text-accent bg-accent/5 glow-accent'
                    : 'border-spark text-spark bg-spark/5 glow-spark'
                  : 'border-white/5 text-ink-700 hover:border-white/10'
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        {/* Intensity */}
        <div className="glass p-4 rounded-2xl border border-white/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3">Intensity</p>
          <div className="flex gap-2">
            {['Low', 'Med', 'High'].map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFormData({ ...formData, intensity: lvl })}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  formData.intensity === lvl
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-white/5 border-white/10 text-ink-600 hover:border-white/20'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Media upload */}
        <div className="glass p-4 rounded-2xl border border-white/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3">Photos / Video</p>
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mediaPreviews.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-ink-800">
                  {m.type === 'video'
                    ? <video src={m.url} className="w-full h-full object-cover" />
                    : <img src={m.url} alt="" className="w-full h-full object-cover" />
                  }
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
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
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-xl text-ink-600 text-xs font-bold hover:border-accent/40 hover:text-accent transition-colors"
          >
            <Image size={15} />
            Add Photos or Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleMediaSelect}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-ink-900 font-display font-black py-6 rounded-[2.5rem] glow-accent uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-50 disabled:grayscale"
        >
          {loading
            ? <Loader2 className="animate-spin" />
            : <><Share2 size={22} /> Sync Game</>
          }
        </button>
      </form>
    </div>
  )
}
