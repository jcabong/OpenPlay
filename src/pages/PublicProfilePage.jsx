import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Trophy, Clock, ArrowLeft, MapPin } from 'lucide-react'

const SPORTS = ['tennis', 'pickleball', 'golf', 'tabletennis', 'badminton']

export default function PublicProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSport, setActiveSport] = useState('all')

  useEffect(() => { if (userId) fetchData() }, [userId])

  async function fetchData() {
    setLoading(true)

    const [{ data: u }, { data: g }, { data: po }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('posts').select('*').eq('user_id', userId).order('inserted_at', { ascending: false }),
    ])

    setProfile(u)
    setGames(g || [])
    setPosts(po || [])
    setLoading(false)
  }

  const filteredGames = activeSport === 'all'
    ? games
    : games.filter(g => g.sport === activeSport)

  const wins = filteredGames.filter(g => g.result === 'win').length
  const losses = filteredGames.filter(g => g.result === 'loss').length
  const total = filteredGames.length
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : 0

  const sportStats = SPORTS.map(sport => ({
    sport,
    wins: games.filter(g => g.sport === sport && g.result === 'win').length,
    total: games.filter(g => g.sport === sport).length,
  })).filter(s => s.total > 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-2xl">🏸</span>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center text-ink-50">
        <p className="text-ink-400 mb-4">Player not found</p>
        <button onClick={() => navigate(-1)} className="text-accent text-sm font-bold uppercase">
          Go Back
        </button>
      </div>
    )
  }

  const displayName = profile.username || 'Player'

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors mb-8 text-xs font-black uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl mb-4 glow-accent">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{displayName}</h1>
      </div>

      {/* Sport Filter — same as leaderboard */}
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

      {/* Stats — mirrors leaderboard ranking logic */}
      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-6 bg-gradient-to-br from-white/5 to-transparent">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-4 border-b border-white/5 pb-2">
          <span>{activeSport === 'all' ? 'Career Stats' : `${activeSport} Stats`}</span>
          <Trophy size={14} className="text-accent" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-accent">{wins}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{total}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Matches</p>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-ink-600 font-black uppercase">{wins}W</span>
              <span className="text-[8px] text-ink-600 font-black uppercase">{losses}L</span>
            </div>
          </div>
        )}
      </div>

      {/* Per-Sport Rankings — same source as leaderboard */}
      {sportStats.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[10px] font-black uppercase text-ink-600 mb-3 ml-2 flex items-center gap-2">
            <Trophy size={12} /> Sport Rankings
          </h2>
          <div className="space-y-2">
            {sportStats.sort((a, b) => b.wins - a.wins).map(stat => (
              <div
                key={stat.sport}
                className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-ink-400 w-20">{stat.sport}</span>
                  <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{
                        width: `${stat.total > 0 ? (stat.wins / stat.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-accent font-display font-bold text-sm">{stat.wins}</span>
                  <span className="text-ink-600 text-[10px] font-black"> /{stat.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-2 flex items-center gap-2">
        <Clock size={12} /> Recent Highlights
      </h2>
      <div className="space-y-4">
        {posts.slice(0, 10).map(post => (
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
        {posts.length === 0 && (
          <div className="text-center py-10 glass border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">
            No activities logged yet
          </div>
        )}
      </div>
    </div>
  )
}
