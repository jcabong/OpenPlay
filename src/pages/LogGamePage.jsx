import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Share2, Loader2, Check, Search, X, Image, Video } from 'lucide-react'

// ─── SETUP REQUIRED ──────────────────────────────────────────────────────────
// 1. Create a Supabase Storage bucket named "post-media" (public)
// 2. Add RLS policy: allow authenticated users to INSERT (upload)
//    SQL: create policy "Auth users can upload" on storage.objects
//         for insert to authenticated with check (bucket_id = 'post-media');
//    SQL: create policy "Public read" on storage.objects
//         for select to public using (bucket_id = 'post-media');
// 3. Add columns to posts table (if not present):
//    alter table public.posts add column if not exists media_url text;
//    alter table public.posts add column if not exists media_type text;
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET = 'post-media'
const MAX_FILE_MB = 50
const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/webm']
}

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    sport: 'tennis',
    court_name: '',
    result: 'win',
    score: '',
    intensity: 'Med',
    mood: '🔥'
  })

  // Opponent tagging
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  // Media upload state
  const [mediaFile, setMediaFile] = useState(null)           // File object
  const [mediaPreview, setMediaPreview] = useState(null)     // blob URL for preview
  const [mediaType, setMediaType] = useState(null)           // 'image' | 'video'
  const [uploadProgress, setUploadProgress] = useState(0)
  const [mediaError, setMediaError] = useState('')

  // Cleanup preview blob URL on unmount
  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview) }
  }, [mediaPreview])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && !taggedUser) handleSearch(searchQuery)
      else setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleSearch(query) {
    setIsSearching(true)
    const { data } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5)
    setSearchResults(data || [])
    setIsSearching(false)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) fileInputRef.current.value = ''
    setMediaError('')

    if (!file) return

    const isImage = ACCEPTED_TYPES.image.includes(file.type)
    const isVideo = ACCEPTED_TYPES.video.includes(file.type)

    if (!isImage && !isVideo) {
      setMediaError('Only JPG, PNG, WebP, GIF, MP4, MOV, or WebM files are allowed.')
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_MB) {
      setMediaError(`File too large. Max size is ${MAX_FILE_MB}MB.`)
      return
    }

    // Clean up old preview
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)

    setMediaFile(file)
    setMediaType(isImage ? 'image' : 'video')
    setMediaPreview(URL.createObjectURL(file))
  }

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setMediaError('')
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadMediaToStorage() {
    if (!mediaFile) return null

    // Unique path: userId/timestamp-filename
    const ext = mediaFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${ext}`

    setUploadProgress(10)

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, mediaFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: mediaFile.type
      })

    setUploadProgress(80)

    if (error) {
      console.error('Storage upload error:', error)
      throw new Error('Media upload failed: ' + error.message)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    setUploadProgress(100)
    return urlData.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !user) return
    setLoading(true)
    setMediaError('')

    try {
      let mediaUrl = null

      // Upload media first if present
      if (mediaFile) {
        mediaUrl = await uploadMediaToStorage()
      }

      // 1. Save to games table
      const { error: gameError } = await supabase.from('games').insert([{
        user_id: user.id,
        ...formData,
        opponent_name: taggedUser ? taggedUser.username : searchQuery,
        tagged_opponent_id: taggedUser ? taggedUser.id : null,
        created_at: new Date().toISOString()
      }])
      if (gameError) throw gameError

      // 2. Save to posts table (feed)
      const opponentDisplay = taggedUser ? `@${taggedUser.username}` : (searchQuery || 'Open Play')
      const { error: postError } = await supabase.from('posts').insert([{
        user_id: user.id,
        content: `🎾 Just logged a ${formData.sport} match at ${formData.court_name}. Result: ${formData.result.toUpperCase()} (${formData.score}). Vs: ${opponentDisplay}`,
        location_name: formData.court_name,
        sport: formData.sport,
        media_url: mediaUrl,
        media_type: mediaUrl ? mediaType : null,
        inserted_at: new Date().toISOString()
      }])
      if (postError) console.error('Feed sync issue:', postError.message)

      navigate('/profile')
    } catch (err) {
      alert('Error saving match: ' + err.message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold italic uppercase tracking-tighter text-white">Record Match</h1>
        <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1">Sync your performance to the network</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Sport Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['tennis', 'pickleball', 'golf', 'tabletennis', 'badminton'].map(s => (
            <button key={s} type="button" onClick={() => setFormData({ ...formData, sport: s })}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${formData.sport === s ? 'bg-accent text-ink-900 border-accent glow-accent scale-105' : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Main Details Card */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/10 space-y-4 bg-gradient-to-br from-white/5 to-transparent">

          {/* Location */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <MapPin size={18} className="text-ink-600" />
            <input
              className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Where did you play?"
              value={formData.court_name}
              onChange={e => setFormData({ ...formData, court_name: e.target.value })}
              required
            />
          </div>

          {/* Opponent Tagging */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
              <Users size={18} className={taggedUser ? 'text-accent' : 'text-ink-600'} />
              <input
                className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
                placeholder="Tag Opponent (Username)"
                value={taggedUser ? `@${taggedUser.username}` : searchQuery}
                onChange={e => { setTaggedUser(null); setSearchQuery(e.target.value) }}
              />
              {isSearching && <Loader2 size={14} className="animate-spin text-ink-600" />}
              {taggedUser && (
                <button type="button" onClick={() => { setTaggedUser(null); setSearchQuery('') }} className="text-spark p-1">
                  <X size={16} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && !taggedUser && (
              <div className="absolute z-50 w-full mt-2 bg-ink-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {searchResults.map(u => (
                  <button key={u.id} type="button"
                    onClick={() => { setTaggedUser(u); setSearchResults([]) }}
                    className="w-full text-left px-4 py-3 text-sm text-ink-100 hover:bg-accent hover:text-ink-900 transition-colors flex items-center justify-between border-b border-white/5 last:border-none">
                    <span>@{u.username}</span>
                    <Check size={14} className="opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <Search size={18} className="text-ink-600" />
            <input
              className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Final Score (e.g. 6-2, 6-4)"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: e.target.value })}
            />
          </div>
        </div>

        {/* Result Selector */}
        <div className="grid grid-cols-2 gap-4">
          {['win', 'loss'].map(res => (
            <button key={res} type="button" onClick={() => setFormData({ ...formData, result: res })}
              className={`py-5 rounded-[2rem] font-display font-bold uppercase italic border-2 transition-all duration-300 tracking-tighter text-lg ${formData.result === res ? (res === 'win' ? 'border-accent text-accent bg-accent/5 glow-accent' : 'border-spark text-spark bg-spark/5 shadow-[0_0_20px_rgba(255,50,50,0.1)]') : 'border-white/5 text-ink-800 opacity-50 hover:opacity-100'}`}>
              {res}
            </button>
          ))}
        </div>

        {/* ── MEDIA UPLOAD ── */}
        <div className="glass p-5 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent space-y-3">
          <p className="text-[10px] font-black uppercase text-ink-600">Add Photo or Video (optional)</p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {!mediaFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-white/10 text-ink-600 hover:border-accent/40 hover:text-accent transition-all"
            >
              <div className="flex gap-3">
                <Image size={22} />
                <Video size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Tap to add photo or video
              </span>
              <span className="text-[9px] text-ink-700 uppercase">
                JPG · PNG · MP4 · MOV · Max {MAX_FILE_MB}MB
              </span>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              {mediaType === 'video' ? (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full max-h-52 object-cover"
                  playsInline
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full max-h-52 object-cover"
                />
              )}
              <button
                type="button"
                onClick={clearMedia}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-ink-900/80 text-white border border-white/10 hover:bg-spark/80 transition-colors"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-ink-900/70 text-[9px] uppercase font-black text-ink-400 flex items-center gap-1.5">
                {mediaType === 'video' ? <Video size={10} /> : <Image size={10} />}
                {mediaFile.name}
                <span className="ml-auto">{(mediaFile.size / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </div>
          )}

          {mediaError && (
            <p className="text-spark text-[10px] font-bold uppercase tracking-wide">{mediaError}</p>
          )}

          {/* Upload progress bar (shown while uploading) */}
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          disabled={loading}
          className="w-full bg-accent text-ink-900 font-display font-black py-6 rounded-[2.5rem] glow-accent uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-50 disabled:grayscale mt-4"
        >
          {loading
            ? <Loader2 className="animate-spin" />
            : <><Share2 size={24} /> Sync Game</>
          }
        </button>

      </form>
    </div>
  )
}
