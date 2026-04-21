import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Clock, MapPin, ArrowLeft } from 'lucide-react'

const ELO_TIER_COLOR = {
  Elite:        '#f59e0b',
  Advanced:     '#c8ff00',
  Intermediate: '#60a5fa',
  Casual:       '#a78bfa',
  Beginner:     'rgba(255,255,255,0.45)',
  Bronze:       '#f59e0b',
  Silver:       '#94a3b8',
  Gold:         '#facc15',
  Platinum:     '#c084fc',
  Diamond:      '#60a5fa',
}

function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-spark/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-100 truncate">
          {sport?.label}
          {game.opponent_name && <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>}
        </p>
        {game.court_name && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{game.court_name}{game.city ? ` · ${game.city}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>
          {isWin ? 'WIN' : 'LOSS'}
        </p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

const ALL_SPORTS = ['badminton', 'pickleball', 'tennis', 'tabletennis', 'golf']

export default function PublicProfilePage() {
  // The route param may be a username OR a UUID — handle both
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile]     = useState(null)
  const [games, setGames]         = useState([])
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeSport, setActiveSport] = useState('all')
  const [activeTab, setActiveTab] = useState('Matches')

  useEffect(() => {
    if (userId) fetchData()
  }, [userId])

  async function fetchData() {
    setLoading(true)

    // Determine if param looks like a UUID or a username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

    const { data: u } = await supabase
      .from('users')
      .select('*')
      .eq(isUUID ? 'id' : 'username', userId)
      .single()

    if (!u) { setLoading(false); return }
    setProfile(u)

    const [{ data: g }, { data: po }] = await Promise.all([
      supabase
        .from('games')
        .select('id, sport, result, score, court_name, city, opponent_name, created_at')
        .eq('user_id', u.id)          // always use resolved id
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('id, content, sport, location_name, media_urls, inserted_at')
        .eq('author_id', u.id)        // always use resolved id
        .eq('is_deleted', false)
        .order('inserted_at', { ascending: false })
        .limit(20),
    ])

    setGames(g || [])
    setPosts(po || [])
    setLoading(false)
  }

  // Stats derived from games
  const filteredGames = activeSport === 'all'
    ? games
    : games.filter(g => g.sport === activeSport)

  const wins    = filteredGames.filter(g => g.result === 'win').length
  const losses  = filteredGames.filter(g => g.result === 'loss').length
  const total   = filteredGames.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const sportBreakdown = ALL_SPORTS
    .map(sport => ({
      sport,
      wins:  games.filter(g => g.sport === sport && g.result === 'win').length,
      total: games.filter(g => g.sport === sport).length,
    }))
    .filter(s => s.total > 0)
    .sort((a, b) => b.wins - a.wins)

  const eloColor = ELO_TIER_COLOR[profile?.skill_tier] || 'rgba(255,255,255,0.45)'

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
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center text-ink-50 gap-4">
        <p className="text-ink-400 text-sm">Player not found</p>
        <button onClick={() => navigate(-1)} className="text-accent text-xs font-black uppercase">
          ← Go Back
        </button>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username || 'Player'
  const hasAvatar   = profile.avatar_url && profile.avatar_type !== 'initials'
  const initial     = (profile.username || 'P').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-6">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors mb-6 text-[10px] font-black uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="shrink-0">
          {hasAvatar ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold uppercase italic text-white truncate">{displayName}</h1>
          <p className="text-accent text-sm font-bold">@{profile.username}</p>
          {(profile.city || profile.province || profile.region) && (
            <div className="flex items-center gap-1 text-ink-500 text-[10px] font-bold mt-1">
              <MapPin size={9} className="text-accent shrink-0" />
              {[profile.city, profile.province || profile.region].filter(Boolean).join(', ')}
            </div>
          )}
          {profile.bio && (
            <p className="text-ink-400 text-xs mt-1 line-clamp-2">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* ELO badge */}
      {profile.elo_rating && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600">ELO Rating</p>
            <p className="font-display text-2xl font-bold italic" style={{ color: eloColor }}>
              {profile.elo_rating}
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600">Tier</p>
            <p className="text-sm font-black uppercase" style={{ color: eloColor }}>
              {profile.skill_tier || 'Casual'}
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600">Matches</p>
            <p className="text-sm font-black text-white">{games.length}</p>
          </div>
        </div>
      )}

      {/* Sport Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
        {[{ id: 'all', label: 'All' }, ...SPORTS].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSport(s.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
              activeSport === s.id
                ? 'bg-accent text-ink-900 border-accent'
                : 'bg-white/5 border-white/10 text-ink-500'
            }`}
          >
            {s.emoji ? `${s.emoji} ` : ''}{s.label}
          </button>
        ))}
      </div>

      {/* Stats card */}
      <div className="glass p-5 rounded-[2rem] border border-white/10 mb-5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-3 border-b border-white/5 pb-2">
          <span className="flex items-center gap-2">
            <Trophy size={12} className="text-accent" />
            {activeSport === 'all' ? 'Career Stats' : `${activeSport} Stats`}
          </span>
          <span className="text-ink-700">{total} games</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-accent">{wins}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-spark">{losses}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Losses</p>
          </div>
        </div>
        {total > 0 ? (
          <div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${winRate}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-ink-600 font-black uppercase">{wins}W</span>
              <span className="text-[8px] text-ink-600 font-black uppercase">{losses}L</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-ink-700 text-[10px] uppercase font-black py-2">No games logged yet</p>
        )}
      </div>

      {/* Per-Sport Breakdown */}
      {sportBreakdown.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] font-black uppercase text-ink-600 mb-3 ml-1 flex items-center gap-2">
            <Trophy size={12} /> Sport Breakdown
          </h2>
          <div className="space-y-2">
            {sportBreakdown.map(stat => {
              const sport = SPORTS.find(s => s.id === stat.sport)
              const pct   = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0
              return (
                <div key={stat.sport} className="glass p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <span className="text-base shrink-0">{sport?.emoji || '🏸'}</span>
                  <span className="text-[10px] font-black uppercase text-ink-400 w-20 shrink-0">{stat.sport}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-right shrink-0 min-w-[48px]">
                    <span className="text-accent font-display font-bold text-sm">{stat.wins}</span>
                    <span className="text-ink-600 text-[10px] font-black">/{stat.total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs: Matches / Posts */}
      <div className="flex rounded-2xl overflow-hidden border border-white/10 glass mb-4">
        {['Matches', 'Posts'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400'
            }`}
          >
            {tab === 'Matches' ? <Trophy size={12} /> : <Clock size={12} />}
            {tab}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'
            }`}>
              {tab === 'Matches' ? filteredGames.length : posts.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Matches' && (
        filteredGames.length === 0 ? (
          <div className="text-center py-12 text-ink-600 text-xs font-black uppercase tracking-widest">
            No matches yet
          </div>
        ) : (
          <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
            {filteredGames.map(game => <MatchRow key={game.id} game={game} />)}
          </div>
        )
      )}

      {activeTab === 'Posts' && (
        posts.length === 0 ? (
          <div className="text-center py-12 text-ink-600 text-xs font-black uppercase tracking-widest">
            No posts yet
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const sport = SPORTS.find(s => s.id === post.sport)
              const dateVal = post.inserted_at
              return (
                <div key={post.id} className="glass p-4 rounded-[1.5rem] border border-white/5">
                  {sport && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 block">
                      {sport.emoji} {sport.label}
                    </span>
                  )}
                  {post.content && (
                    <p className="text-sm text-ink-100 leading-relaxed line-clamp-3">{post.content}</p>
                  )}
                  {post.media_urls?.length > 0 && (
                    <p className="text-[9px] text-ink-600 font-bold mt-1">📎 {post.media_urls.length} media</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {post.location_name ? (
                      <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5">
                        <MapPin size={8} className="text-accent" />{post.location_name}
                      </p>
                    ) : <span />}
                    <p className="text-[9px] text-ink-700">
                      {dateVal ? new Date(dateVal).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
