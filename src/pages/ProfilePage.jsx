import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin } from 'lucide-react'

const SPORTS = ['badminton', 'pickleball', 'tennis', 'tabletennis', 'golf']

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSport, setActiveSport] = useState('all')

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)

    // Stats come ONLY from games table — single source of truth, same as leaderboard
    const [{ data: g }, { data: po }] = await Promise.all([
      supabase
        .from('games')
        .select('id, sport, result, score, court_name, created_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)  // ← ONLY ADDED THIS LINE
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('id, content, sport, location_name, inserted_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)  // ← ONLY ADDED THIS LINE
        .order('inserted_at', { ascending: false })
        .limit(20)
    ])

    setGames(g || [])
    setPosts(po || [])
    setLoading(false)
  }

  // Same filter logic as leaderboard
  const filteredGames = activeSport === 'all'
    ? games
    : games.filter(g => g.sport === activeSport)

  const wins   = filteredGames.filter(g => g.result === 'win').length
  const losses = filteredGames.filter(g => g.result === 'loss').length
  const total  = filteredGames.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  // Per-sport breakdown — mirrors leaderboard ranking exactly
  const sportBreakdown = SPORTS
    .map(sport => ({
      sport,
      wins:  games.filter(g => g.sport === sport && g.result === 'win').length,
      total: games.filter(g => g.sport === sport).length,
    }))
    .filter(s => s.total > 0)
    .sort((a, b) => b.wins - a.wins)

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Player'

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">

      {/* Avatar + Username */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl mb-4 glow-accent">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{displayName}</h1>
        <p className="text-ink-600 text-[9px] uppercase font-black tracking-widest mt-1">
          {games.length} matches logged
        </p>
      </div>

      {/* Sport Filter — same tabs as leaderboard */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-6">
        <button
          onClick={() => setActiveSport('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
            activeSport === 'all'
              ? 'bg-accent text-ink-900 border-accent glow-accent'
              : 'bg-white/5 border-white/10 text-ink-500'
          }`}
        >
          All
        </button>
        {SPORTS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSport(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
              activeSport === s
                ? 'bg-accent text-ink-900 border-accent glow-accent'
                : 'bg-white/5 border-white/10 text-ink-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stats — same source as leaderboard */}
      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-6 bg-gradient-to-br from-white/5 to-transparent">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-4 border-b border-white/5 pb-2">
          <span className="flex items-center gap-2">
            <Trophy size={12} className="text-accent" />
            {activeSport === 'all' ? 'Career Stats' : `${activeSport} Stats`}
          </span>
          <span className="text-ink-700">{total} games</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-accent">{wins}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{losses}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Losses</p>
          </div>
        </div>

        {total > 0 ? (
          <div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-ink-600 font-black uppercase">{wins}W</span>
              <span className="text-[8px] text-ink-600 font-black uppercase">{losses}L</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-ink-700 text-[10px] uppercase font-black py-2">
            No {activeSport === 'all' ? '' : activeSport + ' '}games logged yet
          </p>
        )}
      </div>

      {/* Per-Sport Breakdown — same data the leaderboard ranks by */}
      {sportBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[10px] font-black uppercase text-ink-600 mb-3 ml-2 flex items-center gap-2">
            <Trophy size={12} /> Sport Breakdown
          </h2>
          <div className="space-y-2">
            {sportBreakdown.map(stat => {
              const pct = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0
              return (
                <div key={stat.sport} className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-ink-400 w-20 shrink-0">{stat.sport}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-accent font-display font-bold text-sm">{stat.wins}</span>
                    <span className="text-ink-600 text-[10px] font-black">/{stat.total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Activity (feed entries, NOT stats source) */}
      <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-2 flex items-center gap-2">
        <Clock size={12} /> Recent Highlights
      </h2>
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="glass p-5 rounded-[2rem] border border-white/5 bg-white/[0.01]">
            <p className="text-ink-600 text-[8px] font-black uppercase mb-2">
              {new Date(post.inserted_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-ink-100">{post.content}</p>
            {post.location_name && (
              <div className="mt-3 flex items-center gap-1 text-ink-500 text-[9px] font-bold uppercase">
                <MapPin size={10} className="text-accent" /> {post.location_name}
              </div>
            )}
          </div>
        ))}
        {!loading && posts.length === 0 && (
          <div className="text-center py-10 glass border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">
            No activities logged yet
          </div>
        )}
      </div>

      <button
        onClick={signOut}
        className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest"
      >
        Sign Out
      </button>
    </div>
  )
}