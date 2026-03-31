import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Target, MapPin, Activity } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [userGames, setUserGames] = useState([])

  useEffect(() => {
    if (user) fetchAllUserData()
  }, [user])

  async function fetchAllUserData() {
    // 1. Get Profile
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    setProfile(p)

    // 2. Get User's Posts
    const { data: posts } = await supabase.from('posts').select('*').eq('user_id', user.id).order('inserted_at', { ascending: false })
    setUserPosts(posts || [])

    // 3. Get User's Games
    const { data: games } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setUserGames(games || [])
  }

  const winRate = userGames.length > 0 
    ? ((userGames.filter(g => g.result === 'win').length / userGames.length) * 100).toFixed(0) 
    : 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-10">
      {/* Header Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center font-display font-bold text-ink-900 text-4xl mb-4 glow-accent">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{profile?.username}</h1>
        <p className="text-ink-500 text-sm">{profile?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="glass p-4 rounded-3xl text-center border border-white/5">
          <p className="text-accent font-display font-bold text-xl">{winRate}%</p>
          <p className="text-[8px] uppercase font-black text-ink-500 tracking-widest">Win Rate</p>
        </div>
        <div className="glass p-4 rounded-3xl text-center border border-white/5">
          <p className="text-ink-50 font-display font-bold text-xl">{userGames.length}</p>
          <p className="text-[8px] uppercase font-black text-ink-500 tracking-widest">Games</p>
        </div>
        <div className="glass p-4 rounded-3xl text-center border border-white/5">
          <p className="text-ink-50 font-display font-bold text-xl">#1</p>
          <p className="text-[8px] uppercase font-black text-ink-500 tracking-widest">Rank</p>
        </div>
      </div>

      {/* Tabs for Posts / Logs */}
      <div className="space-y-6">
        <section>
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-ink-600 mb-4 px-2">
            <Activity size={14}/> Recent Activity
          </h2>
          <div className="space-y-3">
            {userPosts.map(post => (
              <div key={post.id} className="glass p-4 rounded-2xl border border-white/5">
                <p className="text-sm text-ink-100">{post.content}</p>
                {post.location_name && <span className="text-[9px] text-accent mt-2 block italic">📍 {post.location_name}</span>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-ink-600 mb-4 px-2">
            <Trophy size={14}/> Game History
          </h2>
          <div className="space-y-3">
            {userGames.map(game => (
              <div key={game.id} className="glass p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-ink-50">{game.court_name || 'Open Court'}</p>
                  <p className="text-[10px] text-ink-500">{new Date(game.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${game.result === 'win' ? 'bg-accent/10 text-accent' : 'bg-spark/10 text-spark'}`}>
                  {game.result}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}