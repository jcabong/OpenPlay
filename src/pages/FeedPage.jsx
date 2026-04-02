import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Loader2, RefreshCw } from 'lucide-react'
import PostCard from '../components/PostCard'

const ALL_SPORTS = [{ id: 'all', label: 'All', emoji: '🌐' }, ...SPORTS]

export default function FeedPage() {
  const { user }             = useAuth()
  const [posts, setPosts]    = useState([])
  const [loading, setLoading]= useState(true)
  const [sport, setSport]    = useState('all')

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('posts')
      .select(`
        *,
        users (id, username, avatar_url),
        likes (user_id),
        comments (*, users(username))
      `)
      .order('inserted_at', { ascending: false })
      .limit(50)

    if (sport !== 'all') q = q.eq('sport', sport)

    const { data, error } = await q
    if (!error) setPosts(data || [])
    setLoading(false)
  }, [sport])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchFeed)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchFeed])

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Network</h1>
          <p className="text-accent text-[9px] font-black uppercase tracking-widest mt-0.5">Real-time Feed</p>
        </div>
        <button
          onClick={fetchFeed}
          className="p-2 glass rounded-xl border border-white/10 text-ink-500 hover:text-accent transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {ALL_SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${
              sport === s.id
                ? 'bg-accent text-ink-900 border-accent glow-accent scale-105'
                : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">🏸</p>
          <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No posts yet</p>
          <p className="text-ink-700 text-xs mt-1">Be the first to log a match!</p>
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
