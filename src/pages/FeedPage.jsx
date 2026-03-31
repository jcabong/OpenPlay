import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { MapPin, MessageSquare, Loader2, Clock } from 'lucide-react'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchGlobalFeed() }, [])

  async function fetchGlobalFeed() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false })

    if (!error) setPosts(data || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Network</h1>
          <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1 italic">Live Community Feed</p>
        </div>
        <button onClick={fetchGlobalFeed} className="p-2 bg-white/5 rounded-xl border border-white/10 text-ink-500 hover:text-accent"><Clock size={18} /></button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={32} /></div>
      ) : (
        <div className="space-y-6">
          {posts.length === 0 ? (
             <div className="text-center py-20 opacity-50"><MessageSquare className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase">No activity yet</p></div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="glass rounded-[2rem] p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-ink-900">
                    {(post.users?.username || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-ink-50 font-display font-bold text-sm leading-none mb-1">@{post.users?.username || 'player'}</span>
                    <span className="text-ink-600 text-[9px] font-black uppercase tracking-widest italic">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-ink-100 text-sm mb-4 leading-relaxed">{post.content}</p>
                {post.location_name && (
                  <div className="flex items-center gap-1.5 text-ink-500 bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
                    <MapPin size={10} className="text-accent" />
                    <span className="text-[9px] font-bold uppercase">{post.location_name}</span>
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