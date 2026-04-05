import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin, ArrowLeft, Loader2, Swords } from 'lucide-react'

export default function PublicProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // If viewing own profile, redirect to /profile
  useEffect(() => {
    if (currentUser && userId === currentUser.id) {
      navigate('/profile', { replace: true })
    }
  }, [currentUser, userId, navigate])

  useEffect(() => {
    if (userId) fetchData()
  }, [userId])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: p, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !p) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: g } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { data: po } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('inserted_at', { ascending: false })
        .limit(10)

      setProfile(p)
      setGames(g || [])
      setPosts(po || [])
    } catch (err) {
      setNotFound(true)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-6xl">🏸</div>
        <h2 className="font-display text-2xl font-bold text-ink-50 uppercase italic">Player not found</h2>
        <p className="text-ink-500 text-sm text-center">This player might have left the court.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-3 glass rounded-2xl text-accent text-xs font-black uppercase tracking-widest border border-accent/20"
        >
          Go Back
        </button>
      </div>
    )
  }

  const wins = games.filter(g => g.result === 'win').length
  const losses = games.filter(g => g.result === 'loss').length
  const winRate = games.length > 0 ? ((wins / games.length) * 100).toFixed(0) : 0

  // Sport breakdown
  const sportBreakdown = games.reduce((acc, g) => {
    acc[g.sport] = (acc[g.sport] || 0) + 1
    return acc
  }, {})
  const topSport = Object.entries(sportBreakdown).sort((a, b) => b[1] - a[1])[0]

  const initial = (profile?.username || 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">
      {/* Header bar */}
      <div className="sticky top-0 z-10 glass border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-ink-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-display font-bold text-sm uppercase italic tracking-tight text-ink-200">
          @{profile?.username}
        </span>
      </div>

      <div className="px-5 pt-8">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-accent/30 to-accent/5 rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-4xl font-display border border-accent/20 glow-accent">
              <span className="text-accent">{initial}</span>
            </div>
            {/* Online indicator style badge */}
            {topSport && (
              <span className="absolute -bottom-2 -right-2 bg-ink-800 border border-white/10 text-[9px] font-black uppercase px-2 py-1 rounded-full text-accent">
                {topSport[0]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight">
            @{profile?.username}
          </h1>
          <p className="text-ink-500 text-[10px] uppercase font-black tracking-widest mt-1">
            Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="glass p-5 rounded-[2.5rem] border border-white/10 mb-6 bg-gradient-to-br from-white/5 to-transparent">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-4 pb-2 border-b border-white/5">
            <span>Career Stats</span>
            <Trophy size={14} className="text-accent" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
              <p className="text-[8px] uppercase font-black text-ink-600 mt-0.5">Win Rate</p>
            </div>
            <div className="text-center border-x border-white/5">
              <p className="text-2xl font-display font-bold">{games.length}</p>
              <p className="text-[8px] uppercase font-black text-ink-600 mt-0.5">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-court-400">{wins}</p>
              <p className="text-[8px] uppercase font-black text-ink-600 mt-0.5">Victories</p>
            </div>
          </div>

          {/* Win/loss bar */}
          {games.length > 0 && (
            <div className="mt-4">
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div
                  className="bg-accent rounded-l-full transition-all"
                  style={{ width: `${winRate}%` }}
                />
                <div
                  className="bg-spark/60 rounded-r-full flex-1 transition-all"
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-accent font-black uppercase">{wins}W</span>
                <span className="text-[8px] text-spark font-black uppercase">{losses}L</span>
              </div>
            </div>
          )}
        </div>

        {/* Sport Breakdown */}
        {Object.keys(sportBreakdown).length > 0 && (
          <div className="mb-6">
            <h2 className="text-[10px] font-black uppercase text-ink-600 mb-3 ml-1 flex items-center gap-2">
              <Swords size={12} /> Sports Played
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sportBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([sport, count]) => (
                  <div
                    key={sport}
                    className="glass px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2"
                  >
                    <span className="text-[10px] font-black uppercase text-accent">{sport}</span>
                    <span className="text-[9px] text-ink-500 font-bold">{count}x</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-1 flex items-center gap-2">
          <Clock size={12} /> Recent Activity
        </h2>

        {posts.length === 0 && !loading && (
          <div className="text-center py-10 glass border border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">
            No activity yet
          </div>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <div
              key={post.id}
              className="glass p-5 rounded-[2rem] border border-white/5 bg-white/[0.01]"
            >
              <p className="text-ink-600 text-[8px] font-black uppercase mb-2">
                {new Date(post.inserted_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-ink-100 leading-relaxed">{post.content}</p>
              {post.location_name && (
                <div className="mt-3 flex items-center gap-1 text-ink-500 text-[9px] font-bold uppercase">
                  <MapPin size={10} className="text-accent" />
                  {post.location_name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
