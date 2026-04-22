import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin, ArrowLeft, Loader2, Swords, TrendingUp, TrendingDown } from 'lucide-react'

const TIERS = {
  Bronze:   { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.3)',  emoji: '🥉' },
  Silver:   { color: '#a0aec0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.3)', emoji: '🥈' },
  Gold:     { color: '#f6e05e', bg: 'rgba(246,224,94,0.12)',  border: 'rgba(246,224,94,0.3)',  emoji: '🥇' },
  Platinum: { color: '#76e4f7', bg: 'rgba(118,228,247,0.12)', border: 'rgba(118,228,247,0.3)', emoji: '💎' },
  Diamond:  { color: '#90cdf4', bg: 'rgba(144,205,244,0.12)', border: 'rgba(144,205,244,0.3)', emoji: '💠' },
  Legend:   { color: '#c8ff00', bg: 'rgba(200,255,0,0.12)',   border: 'rgba(200,255,0,0.35)',  emoji: '👑' },
}

function TierBadge({ tier, elo }) {
  const cfg = TIERS[tier] || TIERS.Bronze
  return (
    <span className="inline-flex items-center gap-1 font-black uppercase rounded-xl border text-[10px] px-2.5 py-1"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.emoji} {tier} {elo && <span className="opacity-80">· {elo}</span>}
    </span>
  )
}

export default function PublicProfilePage() {
  const { userId, username: usernameParam } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [profile,    setProfile]    = useState(null)
  const [games,      setGames]      = useState([])
  const [posts,      setPosts]      = useState([])
  const [playerElo,  setPlayerElo]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  // Resolve either userId or username param
  const resolvedParam = userId || usernameParam

  useEffect(() => {
    if (!resolvedParam) return
    // If viewing own profile via userId, redirect
    if (currentUser && resolvedParam === currentUser.id) {
      navigate('/profile', { replace: true })
      return
    }
    fetchData()
  }, [resolvedParam, currentUser])

  async function fetchData() {
    setLoading(true)
    try {
      // Try lookup by UUID first, fallback to username
      let profileQuery = supabase.from('users').select('*')
      const isUuid = /^[0-9a-f-]{36}$/i.test(resolvedParam)
      if (isUuid) {
        profileQuery = profileQuery.eq('id', resolvedParam)
      } else {
        profileQuery = profileQuery.eq('username', resolvedParam)
      }

      const { data: p, error } = await profileQuery.single()
      if (error || !p) { setNotFound(true); setLoading(false); return }

      // If this is our own profile, redirect
      if (currentUser && p.id === currentUser.id) {
        navigate('/profile', { replace: true })
        return
      }

      const [{ data: g }, { data: po }, { data: elo }] = await Promise.all([
        supabase.from('games').select('*').eq('user_id', p.id).eq('is_deleted', false).order('created_at', { ascending: false }),
        supabase.from('posts').select('*').eq('user_id', p.id).order('inserted_at', { ascending: false }).limit(10),
        supabase.from('player_elo')
          .select('sport, elo_rating, wins, losses, matches_played, skill_tier')
          .eq('user_id', p.id)
          .order('elo_rating', { ascending: false }),
      ])

      setProfile(p)
      setGames(g || [])
      setPosts(po || [])
      setPlayerElo(elo || [])
    } catch {
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
        <button onClick={() => navigate(-1)}
          className="mt-4 px-6 py-3 glass rounded-2xl text-accent text-xs font-black uppercase tracking-widest border border-accent/20">
          Go Back
        </button>
      </div>
    )
  }

  const wins    = games.filter(g => g.result === 'win').length
  const losses  = games.filter(g => g.result === 'loss').length
  const winRate = games.length > 0 ? ((wins / games.length) * 100).toFixed(0) : 0

  const sportBreakdown = games.reduce((acc, g) => { acc[g.sport] = (acc[g.sport] || 0) + 1; return acc }, {})
  const topSport       = Object.entries(sportBreakdown).sort((a, b) => b[1] - a[1])[0]
  const bestElo        = playerElo.length ? Math.max(...playerElo.map(e => e.elo_rating)) : (profile?.elo_rating || 1000)
  const bestTier       = profile?.skill_tier || 'Bronze'
  const initial        = (profile?.username || 'U').charAt(0).toUpperCase()
  const hasAvatar      = profile?.avatar_url && profile?.avatar_type !== 'initials'

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">
      {/* Header bar */}
      <div className="sticky top-0 z-10 glass border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-ink-400 hover:text-accent transition-colors">
          <ArrowLeft size={18} />
        </button>
        <span className="font-display font-bold text-sm uppercase italic tracking-tight text-ink-200">
          @{profile?.username}
        </span>
      </div>

      <div className="px-5 pt-8">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {hasAvatar ? (
              <img src={profile.avatar_url} alt={profile.username}
                className="w-24 h-24 rounded-[2rem] object-cover border-2"
                style={{ borderColor: (TIERS[bestTier] || TIERS.Bronze).color }} />
            ) : (
              <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center font-bold text-4xl font-display"
                style={{ background: (TIERS[bestTier] || TIERS.Bronze).bg, color: (TIERS[bestTier] || TIERS.Bronze).color,
                         border: `2px solid ${(TIERS[bestTier] || TIERS.Bronze).color}` }}>
                {initial}
              </div>
            )}
            {topSport && (
              <span className="absolute -bottom-2 -right-2 bg-ink-800 border border-white/10 text-[9px] font-black uppercase px-2 py-1 rounded-full text-accent">
                {topSport[0]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight">
            @{profile?.username}
          </h1>
          <div className="mt-2">
            <TierBadge tier={bestTier} elo={bestElo} />
          </div>
          {(profile?.city || profile?.region) && (
            <p className="text-[10px] text-ink-500 font-bold mt-2 flex items-center gap-1">
              <MapPin size={10} className="text-accent" />
              {[profile.city, profile.region].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="text-ink-500 text-[10px] uppercase font-black tracking-widest mt-1">
            Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="glass p-5 rounded-[2.5rem] border border-white/10 mb-5">
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
              <p className="text-2xl font-display font-bold text-accent">{wins}</p>
              <p className="text-[8px] uppercase font-black text-ink-600 mt-0.5">Victories</p>
            </div>
          </div>
          {games.length > 0 && (
            <div className="mt-4">
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="bg-accent rounded-l-full transition-all" style={{ width: `${winRate}%` }} />
                <div className="bg-spark/60 rounded-r-full flex-1 transition-all" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-accent font-black uppercase">{wins}W</span>
                <span className="text-[8px] text-spark font-black uppercase">{losses}L</span>
              </div>
            </div>
          )}
        </div>

        {/* Per-sport ELO */}
        {playerElo.length > 0 && (
          <div className="mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3 flex items-center gap-1.5">
              <TrendingUp size={11} className="text-accent" /> ELO Per Sport
            </p>
            <div className="grid grid-cols-2 gap-2">
              {playerElo.map(pe => {
                const sport   = SPORTS.find(s => s.id === pe.sport)
                const tierCfg = TIERS[pe.skill_tier] || TIERS.Bronze
                return (
                  <div key={pe.sport} className="glass rounded-2xl p-3.5 border"
                    style={{ borderColor: tierCfg.border }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{sport?.emoji || '🏸'}</span>
                      <span className="text-[8px] font-black uppercase rounded-lg border px-1.5 py-0.5"
                        style={{ color: tierCfg.color, background: tierCfg.bg, borderColor: tierCfg.border }}>
                        {tierCfg.emoji} {pe.skill_tier}
                      </span>
                    </div>
                    <p className="font-display text-2xl font-bold italic" style={{ color: tierCfg.color }}>{pe.elo_rating}</p>
                    <p className="text-[9px] font-black uppercase text-ink-600">{sport?.label}</p>
                    <p className="text-[9px] text-ink-600 mt-0.5">{pe.wins}W · {pe.losses}L</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sports breakdown */}
        {Object.keys(sportBreakdown).length > 0 && (
          <div className="mb-5">
            <h2 className="text-[10px] font-black uppercase text-ink-600 mb-3 ml-1 flex items-center gap-2">
              <Swords size={12} /> Sports Played
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sportBreakdown).sort((a,b) => b[1]-a[1]).map(([sport, count]) => (
                <div key={sport} className="glass px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-accent">{sport}</span>
                  <span className="text-[9px] text-ink-500 font-bold">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent posts */}
        <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-1 flex items-center gap-2">
          <Clock size={12} /> Recent Activity
        </h2>
        {posts.length === 0 ? (
          <div className="text-center py-10 glass border border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">
            No activity yet
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="glass p-5 rounded-[2rem] border border-white/5">
                <p className="text-ink-600 text-[8px] font-black uppercase mb-2">
                  {new Date(post.inserted_at || post.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-ink-100 leading-relaxed">{post.content}</p>
                {post.location_name && (
                  <div className="mt-3 flex items-center gap-1 text-ink-500 text-[9px] font-bold uppercase">
                    <MapPin size={10} className="text-accent" />{post.location_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
