import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Loader2, RefreshCw, Image, Send, X } from 'lucide-react'
import PostCard from '../components/PostCard'

const ALL_SPORTS = [{ id: 'all', label: 'All', emoji: '🌐' }, ...SPORTS]

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState('all')

  // Composer state
  const [content, setContent] = useState('')
  const [postSport, setPostSport] = useState('badminton')
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaPreviews, setMediaPreviews] = useState([])
  const [posting, setPosting] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const fileInputRef = useRef(null)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (id, username, avatar_url),
        likes (user_id),
        comments (*, users(username), comment_likes(user_id))
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (sport !== 'all') q = q.eq('sport', sport)

    const { data, error } = await q
    if (error) console.error('Feed error:', error.message)
    else setPosts(data || [])
    setLoading(false)
  }, [sport])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('posts-feed-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchFeed)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchFeed])

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

  async function handlePost() {
    if (!user || (!content.trim() && mediaFiles.length === 0)) return
    setPosting(true)
    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length
        ? await uploadMedia()
        : { urls: [], types: [] }

      const { error } = await supabase.from('posts').insert([{
        author_id: user.id,
        user_id: user.id,
        content: content.trim(),
        sport: postSport,
        media_urls,
        media_types,
        created_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
      }])

      if (error) throw error

      setContent('')
      setMediaFiles([])
      setMediaPreviews([])
      setComposerOpen(false)
      fetchFeed()
    } catch (err) {
      alert('Failed to post: ' + err.message)
    } finally {
      setPosting(false)
    }
  }

  const sportObj = SPORTS.find(s => s.id === postSport)

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-7 rounded-full" style={{ background: '#c8ff00' }} />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Network</h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest ml-4 mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }}>
            Real-time Feed
          </p>
        </div>
        <button
          onClick={fetchFeed}
          className="p-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {ALL_SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase border-2 shrink-0 transition-all duration-200"
            style={sport === s.id
              ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 16px rgba(200,255,0,0.35)' }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
            }
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Post Composer */}
      {user && (
        <div className="px-5 mb-5">
          {!composerOpen ? (
            // Collapsed: tap to open
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/10 text-left transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                style={{ background: '#c8ff00', color: '#0a0a0f' }}
              >
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>What's happening on court?</span>
            </button>
          ) : (
            // Expanded composer
            <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>

              {/* Sport picker inside composer */}
              <div className="flex gap-2 p-4 pb-2 overflow-x-auto no-scrollbar">
                {SPORTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPostSport(s.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all"
                    style={postSport === s.id
                      ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
                    }
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>

              {/* Text area */}
              <div className="px-4 py-2">
                <textarea
                  autoFocus
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-sm"
                  style={{ color: '#ffffff', caretColor: '#c8ff00' }}
                  placeholder={`Share your ${sportObj?.label || 'game'} experience...`}
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              {/* Media previews */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 px-4 pb-3">
                  {mediaPreviews.map((m, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
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

              {/* Action bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-bold transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    <Image size={16} />
                    Photo/Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleMediaSelect}
                  />
                  <button
                    type="button"
                    onClick={() => { setComposerOpen(false); setContent(''); setMediaFiles([]); setMediaPreviews([]) }}
                    className="text-xs font-bold"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Cancel
                  </button>
                </div>

                <button
                  onClick={handlePost}
                  disabled={posting || (!content.trim() && mediaFiles.length === 0)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-40"
                  style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }}
                >
                  {posting ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Post</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={28} style={{ color: '#c8ff00' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">🏸</p>
          <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>No posts yet</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Be the first to log a match!</p>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onRefresh={fetchFeed} />
          ))}
        </div>
      )}
    </div>
  )
}
