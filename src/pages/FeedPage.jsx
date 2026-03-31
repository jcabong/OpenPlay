import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Trophy, MessageSquare, Loader2, Clock } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGlobalFeed()
  }, [])

  async function fetchGlobalFeed() {
    setLoading(true)
    // We removed !inner to ensure posts show up even if profile sync is slow
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          username,
          avatar_url
        )
      `)
      .order('inserted_at', { ascending: false })

    if (error) {
      console.error("Feed Error:", error.message)
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter">Global Feed</h1>
          <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1">Real-time OpenPlay Network</p>
        </div>
        <button onClick={fetchGlobalFeed} className="p-2 bg-white/5 rounded-xl border border-white/10 text-ink-500 hover:text-accent">
          <Clock size={18} />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-20 glass rounded-[2.5rem] border border-dashed border-white/10">
              <MessageSquare size={24} className="mx-auto text-ink-700 mb-2"/>
              <p className="text-ink-600 text-[10px] font-black uppercase tracking-widest">The court is quiet...</p>
              <p className="text-ink-800 text-[9px] mt-1">Log a match to start the conversation.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="glass rounded-[2.5rem] p-6 border border-white/5 shadow-sm bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-ink-900 shadow-[0_0_15px_rgba(200,255,0,0.2)]">
                    {(post.users?.username || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-1">
                      @{post.users?.username || 'anonymous'}
                    </span>
                    <span className="text-ink-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      {new Date(post.inserted_at || post.created_at).toLocaleDateString()}
                      {post.sport && <span className="text-accent">• {post.sport}</span>}
                    </span>
                  </div>
                </div>
                
                <p className="text-ink-100 text-sm mb-4 leading-relaxed">{post.content}</p>

                {post.location_name && (
                  <div className="flex items-center gap-1.5 text-ink-500 bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
                    <MapPin size={10} className="text-accent" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">{post.location_name}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}