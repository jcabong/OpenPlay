import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { notifyMentions } from '../hooks/useNotifications'
import { Loader2, RefreshCw, Image, Send, X, Hash, MapPin, Navigation } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import PostCard from '../components/PostCard'

const ALL_SPORTS = [{ id: 'all', label: 'All', emoji: '🌐' }, ...SPORTS]
const POSTS_PER_PAGE = 10

// Image compression options
const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/jpeg',
}

async function compressImage(file) {
  if (file.type.startsWith('video')) return file
  if (file.size < 500 * 1024) return file
  
  try {
    const compressed = await imageCompression(file, compressionOptions)
    console.log(`📸 Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressed.size / 1024).toFixed(1)}KB`)
    return compressed
  } catch (error) {
    console.error('Compression error:', error)
    return file
  }
}

// ── Mention-aware Textarea ──────────────────────────────────────────────────
function MentionTextarea({ value, onChange, placeholder }) {
  const [results, setResults]   = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [caretPos, setCaretPos] = useState(0)
  const ref                     = useRef(null)

  async function handleChange(e) {
    const val = e.target.value
    const pos = e.target.selectionStart
    setCaretPos(pos)
    onChange(val)
    const match = val.slice(0, pos).match(/@(\w*)$/)
    if (match && match[1].length >= 1) {
      const { data } = await supabase
        .from('users').select('id, username').ilike('username', `${match[1]}%`).limit(5)
      setResults(data || [])
      setShowDrop(true)
    } else {
      setShowDrop(false)
      setResults([])
    }
  }

  function pickUser(username) {
    const before = value.slice(0, caretPos).replace(/@\w*$/, `@${username} `)
    const after  = value.slice(caretPos)
    onChange(before + after)
    setShowDrop(false)
    setResults([])
    setTimeout(() => ref.current?.focus(), 0)
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false) }}
        autoFocus
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-sm leading-relaxed"
        style={{ color: '#ffffff', caretColor: '#c8ff00', minHeight: '80px' }}
        placeholder={placeholder}
      />
      {showDrop && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-full bg-ink-700 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={() => pickUser(u.username)}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-accent hover:bg-white/5 border-b border-white/5 last:border-none"
            >
              @{u.username}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(true)
  const [page, setPage]               = useState(0)
  const [sport, setSport]             = useState('all')
  const observerRef                   = useRef(null)
  const lastPostRef                   = useRef(null)
  
  // Pull to refresh states
  const [refreshing, setRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const feedContainerRef = useRef(null)

  // Composer
  const [content, setContent]               = useState('')
  const [taggedSport, setTaggedSport]       = useState(null)
  const [mediaFiles, setMediaFiles]         = useState([])
  const [mediaPreviews, setMediaPreviews]   = useState([])
  const [posting, setPosting]               = useState(false)
  const [composerOpen, setComposerOpen]     = useState(false)
  const [showSportPicker, setShowSportPicker] = useState(false)
  const [locationName, setLocationName]     = useState('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [gpsLoading, setGpsLoading]         = useState(false)
  const fileInputRef = useRef(null)

  // Fetch initial feed
  const fetchFeed = useCallback(async (isReset = true) => {
    if (isReset) {
      setLoading(true)
      setPage(0)
      setPosts([])
      setHasMore(true)
    }

    const from = isReset ? 0 : page * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1

    let q = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (id, username, display_name, avatar_url, avatar_type),
        likes (user_id),
        comments (*, users(id, username, display_name, avatar_url, avatar_type), comment_likes(user_id), comment_replies(*, users(id, username, display_name, avatar_url, avatar_type)))
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sport !== 'all') q = q.eq('sport', sport)

    const { data, error } = await q
    if (error) {
      console.error('Feed error:', error.message)
      if (isReset) setLoading(false)
      else setLoadingMore(false)
      return
    }

    if (isReset) {
      setPosts(data || [])
      setLoading(false)
    } else {
      setPosts(prev => [...prev, ...(data || [])])
      setLoadingMore(false)
    }

    setHasMore(data?.length === POSTS_PER_PAGE)
    if (data?.length === POSTS_PER_PAGE) {
      setPage(prev => prev + 1)
    }
  }, [sport, page])

  // Reset when sport changes
  useEffect(() => {
    fetchFeed(true)
  }, [sport])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true)
          fetchFeed(false)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (lastPostRef.current) {
      observer.observe(lastPostRef.current)
    }

    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore, posts.length, sport])

  // Pull to refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !refreshing) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && !refreshing && startY > 0) {
      const diff = e.touches[0].clientY - startY
      if (diff > 60) {
        setRefreshing(true)
        fetchFeed(true)
        setTimeout(() => setRefreshing(false), 1000)
      }
    }
  }

  const handleTouchEnd = () => {
    setStartY(0)
  }

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('posts-feed-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchFeed(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchFeed(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchFeed(true))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  function handleMediaSelect(e) {
    const files = Array.from(e.target.files)
    setMediaFiles(prev => [...prev, ...files].slice(0, 4))
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setMediaPreviews(prev => [...prev, { url, type: file.type.startsWith('video') ? 'video' : 'image' }].slice(0, 4))
    })
  }

  function removeMedia(index) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  function resetComposer() {
    setContent('')
    setTaggedSport(null)
    setMediaFiles([])
    setMediaPreviews([])
    setComposerOpen(false)
    setShowSportPicker(false)
    setLocationName('')
    setShowLocationInput(false)
  }

  async function detectLocation() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          )
          const data = await res.json()
          const place = data.address?.suburb || data.address?.city_district || data.address?.city || data.display_name
          setLocationName(place || '')
          setShowLocationInput(true)
        } catch {
          alert('Could not get location name')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { setGpsLoading(false); alert('Location access denied') }
    )
  }

  async function uploadMedia() {
    const urls = [], types = []
    for (const file of mediaFiles) {
      // Compress image before upload
      const fileToUpload = await compressImage(file)
      
      const ext = fileToUpload.type.startsWith('video') ? 'mp4' : 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('openplay-media').upload(path, fileToUpload)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
        urls.push(publicUrl)
        types.push(fileToUpload.type.startsWith('video') ? 'video' : 'image')
      }
    }
    return { urls, types }
  }

  // Composer display info
  const username = profile?.username || user?.email?.split('@')[0] || 'You'
  const initial = username.charAt(0).toUpperCase()
  const hasAvatar = profile?.avatar_url && profile?.avatar_type !== 'initials'
  const avatarColors = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]
  const taggedSportObj = SPORTS.find(s => s.id === taggedSport)

  async function handlePost() {
    if (!user || (!content.trim() && mediaFiles.length === 0)) return
    setPosting(true)
    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length
        ? await uploadMedia()
        : { urls: [], types: [] }

      const { data: newPost, error } = await supabase.from('posts').insert([{
        author_id:     user.id,
        user_id:       user.id,
        content:       content.trim(),
        sport:         taggedSport || null,
        media_urls,
        media_types,
        location_name: locationName.trim() || null,
        created_at:    new Date().toISOString(),
        inserted_at:   new Date().toISOString(),
      }]).select().single()

      if (error) throw error

      if (content.includes('@') && newPost) {
        await notifyMentions({
          text:     content.trim(),
          fromUser: { id: user.id, username },
          postId:   newPost.id,
        })
      }

      resetComposer()
      fetchFeed(true)
    } catch (err) {
      alert('Failed to post: ' + err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div 
      className="min-h-screen"
      ref={feedContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Feed</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.7 }}>
            Real-time · OpenPlay
          </p>
        </div>
        <button
          onClick={() => fetchFeed(true)}
          className="p-2.5 rounded-xl border border-white/10 transition-colors hover:border-white/20"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex justify-center py-4 mb-2">
          <Loader2 className="animate-spin text-accent" size={20} />
          <span className="text-xs text-ink-500 ml-2">Refreshing...</span>
        </div>
      )}

      {/* Sport filter tabs */}
      <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
        {ALL_SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
            style={sport === s.id
              ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      {user && (
        <div className="mb-5">
          {!composerOpen ? (
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0">
                {hasAvatar ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="avatar" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-sm"
                    style={{ background: avatarBg, color: '#0a0a0f' }}>
                    {initial}
                  </div>
                )}
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                What's happening on court?
              </span>
            </button>
          ) : (
            <div className="rounded-3xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>

              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0">
                  {hasAvatar ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-sm"
                      style={{ background: avatarBg, color: '#0a0a0f' }}>
                      {initial}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-white">@{username}</p>
                  {taggedSportObj ? (
                    <button
                      onClick={() => setTaggedSport(null)}
                      className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg mt-0.5"
                      style={{ background: 'rgba(200,255,0,0.12)', color: '#c8ff00' }}
                    >
                      {taggedSportObj.emoji} {taggedSportObj.label}
                      <X size={9} className="ml-1" />
                    </button>
                  ) : (
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>General post</p>
                  )}
                </div>
              </div>

              <div className="px-4 py-2">
                <MentionTextarea
                  value={content}
                  onChange={setContent}
                  placeholder="What's on your mind? Use @mentions..."
                />
              </div>

              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 px-4 pb-3">
                  {mediaPreviews.map((m, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                      style={{ background: 'rgba(0,0,0,0.4)' }}>
                      {m.type === 'video'
                        ? <video src={m.url} className="w-full h-full object-cover" />
                        : <img src={m.url} alt="" className="w-full h-full object-cover" />
                      }
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showLocationInput && (
                <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border"
                  style={{ background: 'rgba(200,255,0,0.05)', borderColor: 'rgba(200,255,0,0.2)' }}>
                  <MapPin size={13} style={{ color: '#c8ff00' }} className="shrink-0" />
                  <input
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="Court or location name…"
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
                  />
                  <button onClick={() => { setLocationName(''); setShowLocationInput(false) }}>
                    <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </button>
                </div>
              )}

              {showSportPicker && (
                <div className="mx-4 mb-3 rounded-2xl border overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Tag a sport (optional)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {SPORTS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setTaggedSport(s.id === taggedSport ? null : s.id); setShowSportPicker(false) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
                        style={taggedSport === s.id
                          ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f' }
                          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                        }
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    title="Add photo/video"
                  >
                    <Image size={18} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />

                  <button
                    onClick={() => setShowSportPicker(!showSportPicker)}
                    className="p-2 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: taggedSport ? '#c8ff00' : 'rgba(255,255,255,0.45)' }}
                    title="Tag a sport"
                  >
                    <Hash size={18} />
                  </button>

                  <button
                    onClick={() => showLocationInput ? setShowLocationInput(false) : detectLocation()}
                    className="p-2 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: locationName ? '#c8ff00' : 'rgba(255,255,255,0.45)' }}
                    title="Tag court / location"
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                  </button>

                  <button
                    onClick={resetComposer}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors hover:bg-white/5 ml-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Cancel
                  </button>
                </div>

                <button
                  onClick={handlePost}
                  disabled={posting || (!content.trim() && mediaFiles.length === 0)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-40 active:scale-95"
                  style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }}
                >
                  {posting ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Post</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts with Infinite Scroll */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={28} style={{ color: '#c8ff00' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">🏸</p>
          <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>No posts yet</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              ref={index === posts.length - 1 ? lastPostRef : null}
            >
              <PostCard post={post} onRefresh={() => fetchFeed(true)} />
            </div>
          ))}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" size={20} style={{ color: '#c8ff00' }} />
              <span className="text-xs text-ink-500 ml-2">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}