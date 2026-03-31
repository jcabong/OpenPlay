import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Edit3, Check, Clock, Users, Trash2 } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([]) // Matches for stats
  const [posts, setPosts] = useState([]) // Activities for display
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: g } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    const { data: po } = await supabase.from('posts').select('*').eq('user_id', user.id).order('inserted_at', { ascending: false })
    
    setProfile(p); setGames(g || []); setPosts(po || [])
    setLoading(false)
  }

  const winRate = games.length > 0 ? ((games.filter(g => g.result === 'win').length / games.length) * 100).toFixed(0) : 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl mb-4">
          {(profile?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{profile?.username}</h1>
      </div>

      {/* Summary Dashboard */}
      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-10 grid grid-cols-2 gap-6 bg-gradient-to-br from-white/5 to-transparent">
        <div className="col-span-2 border-b border-white/5 pb-2 flex justify-between items-center text-[10px] font-black uppercase text-ink-600">
          Career Stats <Trophy size={14} className="text-accent" />
        </div>
        <div><p className="text-2xl font-display font-bold text-accent">{winRate}%</p><p className="text-[8px] uppercase font-black text-ink-600">Win Rate</p></div>
        <div><p className="text-2xl font-display font-bold">{games.length}</p><p className="text-[8px] uppercase font-black text-ink-600">Matches</p></div>
      </div>

      {/* Activities (The Feed inside Profile) */}
      <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-2 flex items-center gap-2"><Clock size={12} /> Recent Highlights</h2>
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="glass p-5 rounded-[2rem] border border-white/5 relative bg-white/[0.01]">
            <p className="text-ink-600 text-[8px] font-black uppercase mb-2">{new Date(post.inserted_at).toLocaleDateString()}</p>
            <p className="text-sm text-ink-100">{post.content}</p>
            {post.location_name && (
              <div className="mt-3 flex items-center gap-1 text-ink-500 text-[9px] font-bold uppercase">
                <MapPin size={10} className="text-accent" /> {post.location_name}
              </div>
            )}
          </div>
        ))}
        {!loading && posts.length === 0 && (
          <div className="text-center py-10 glass border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">No activities logged yet</div>
        )}
      </div>

      <button onClick={signOut} className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest">Sign Out</button>
    </div>
  )
}