import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin, ArrowLeft, Loader2, Swords, TrendingUp, Star, MessageSquare } from 'lucide-react'

function EloRow({ sport, elo, wins, losses }) {
  const sportObj = SPORTS.find(s => s.id === sport)
  const tier = elo >= 1400 ? { label: 'Elite',    color: '#f59e0b' }
             : elo >= 1200 ? { label: 'Advanced', color: '#c8ff00' }
             : elo >= 1100 ? { label: 'Skilled',  color: '#60a5fa' }
             : elo >= 1000 ? { label: 'Ranked',   color: '#a78bfa' }
             :               { label: 'Rookie',   color: 'rgba(255,255,255,0.4)' }
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border border-white/8"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{sportObj?.emoji}</span>
        <div>
          <p className="text-xs font-black" style={{ color: '#ffffff' }}>{sportObj?.label}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tier.color }}>{tier.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-xl italic leading-none" style={{ color: tier.color }}>{elo}</p>
        <p className="text-[9px] text-ink-500">{wins}W · {losses}L</p>
      </div>
    </div>
  )
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
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>{isWin ? 'WIN' : 'LOSS'}</p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function PostRow({ post }) {
  const sport    = SPORTS.find(s => s.id === post.sport)
  const hasMedia = post.media_urls?.length > 0
  return (
    <div className="flex items-start gap-3 p-4 border-b border-white/5 last:border-none">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 bg-white/5">
        {sport ? sport.emoji : '💬'}
      </div>
      <div className="flex-1 min-w-0">
        {sport && <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 block">{sport.label}</span>}
        {post.content && <p className="text-sm text-ink-200 leading-relaxed line-clamp-2">{post.content}</p>}
        {hasMedia && <p className="text-[9px] text-ink-600 font-bold mt-1">📎 {post.media_urls.length} media attached</p>}
        {post.location_name && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{post.location_name}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-ink-600 text-[10px] font-bold justify-end">
          <MessageSquare size={10} />{post.comments?.length || 0}
        </div>
        <p className="text-[9px] text-ink-700 mt-1">
          {new Date(post.inserted_at || post.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function ReputationBadge({ label, value, emoji }) {
  const stars = Math.round(value || 0)
  return (
    <div className="flex-1 p-3 rounded-2xl border border-white/8 text-center"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <p className="text-base mb-1">{emoji}</p>
      <p className="font-display font-bold text-lg text-accent leading-none">
        {value > 0 ? Number(value).toFixed(1) : '—'}
      </p>
      <div className="flex justify-center gap-0.5 my-1">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={8} style={{
            fill:   s <= stars ? '#c8ff00' : 'transparent',
            stroke: s <= stars ? '#c8ff00' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>
      <p className="text-[8px] font-black uppercase tracking-widest text-ink-600">{label}</p>
    </div>
  )
}

const TABS = ['Matches', 'Posts', 'Stats']

export default function PublicProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]       = useState(null)
  const [games, setGames]           = useState([])
  const [posts, setPosts]           = useState([])
  const [eloRatings, setEloRatings] = useState([])
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [activeTab, setActiveTab]   = useState('Matches')

  // Redirect own profile
  useEffect(() => {
    if (currentUser && userId === currentUser.id) {
      navigate('/profile', { replace: true })
    }
  }, [currentUser, userId, navigate])

  useEffect(() => {
    if (userId && (!currentUser || userId !== currentUser.id)) {
      fetchData()
    }
  }, [userId, currentUser])

  async function fetchData() {
    setLoading(true)
    setNotFound(false)

    try {
      // Detect UUID vs username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url, avatar_type, city, region, bio, created_at, elo_rating, skill_tier, avg_skill, avg_sportsmanship, avg_reliability, rating_count')

      query = isUUID ? query.eq('id', userId) : query.eq('username', userId)

      const { data: p, error } = await query.maybeSingle()

      if (error || !p) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(p)

      // Parallel fetch all data
      const [{ data: g }, { data: po }, { data: elo }] = await Promise.all([
        supabase.from('games')
          .select('*')
          .eq('user_id', p.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase.from('posts')
          .select('*, comments(id)')
          .eq('author_id', p.id)
          .eq('is_deleted', false)
          .order('inserted_at', { ascending: false })
          .limit(20),
        supabase.from('player_elo')
          .select('sport, elo_rating, wins, losses, matches_played')
          .eq('user_id', p.id)
          .gte('matches_played', 1)
          .order('elo_rating', { ascending: false }),
      ])

      setGames(g || [])
      setPosts(po || [])
      setEloRatings(elo || [])
    } catch (err) {
      console.error('Fetch exception:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  if (notFound || !profile) {
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

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
  const totalLosses  = games.filter(g => g.result === 'loss').length

  const sportBreakdown = games.reduce((acc, g) => {
    acc[g.sport] = (acc[g.sport] || 0) + 1
    return acc
  }, {})

  const initial   = (profile?.username || 'U').charAt(0).toUpperCase()
  const hasAvatar = profile?.avatar_url && profile?.avatar_type !== 'initials'
  const hasReputation = (profile?.rating_count || 0) > 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      {/* Sticky header bar */}
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
        {/* Avatar + identity */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {hasAvatar ? (
              <img src={profile.avatar_url} alt="avatar"
                className="w-24 h-24 rounded-[2rem] object-cover border-2 border-accent" />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-accent/30 to-accent/5 rounded-[2rem] flex items-center justify-center font-bold text-4xl border border-accent/20">
                <span className="text-accent">{initial}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight">
            {profile?.display_name || `@${profile?.username}`}
          </h1>
          <p className="text-accent text-[10px] font-black uppercase tracking-widest mt-1">
            @{profile?.username}
          </p>
          {(profile?.city || profile?.region) && (
            <div className="flex items-center gap-1 mt-2 text-ink-500 text-[9px] font-bold">
              <MapPin size={10} className="text-accent" />
              {[profile?.city, profile?.region].filter(Boolean).join(', ')}
            </div>
          )}
          {profile?.bio && (
            <p className="text-ink-400 text-sm mt-3 text-center leading-relaxed max-w-sm">{profile.bio}</p>
          )}
          <p className="text-ink-500 text-[9px] uppercase font-black tracking-widest mt-2">
            Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Quick stats — matches ProfilePage layout */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { val: totalWins,     label: 'Wins'      },
            { val: `${winRate}%`, label: 'Win Rate'  },
            { val: totalMatches,  label: 'Matches'   },
          ].map(({ val, label }) => (
            <div key={label} className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
              <p className="font-display text-2xl font-bold text-accent italic">{val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Win/Loss bar */}
        {totalMatches > 0 && (
          <div className="mb-5 glass p-4 rounded-[1.5rem] border border-white/10">
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-1">
              <div className="bg-accent rounded-l-full" style={{ width: `${winRate}%` }} />
              <div className="bg-spark/60 rounded-r-full flex-1" />
            </div>
            <div className="flex justify-between">
              <span className="text-[8px] text-accent font-black uppercase">{totalWins}W</span>
              <span className="text-[8px] text-spark font-black uppercase">{totalLosses}L</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex rounded-2xl overflow-hidden border border-white/10 glass">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400 hover:text-white'
                }`}>
                {tab === 'Matches' && <Trophy size={12} />}
                {tab === 'Posts'   && <MessageSquare size={12} />}
                {tab === 'Stats'   && <TrendingUp size={12} />}
                {tab}
                {tab === 'Matches' && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'}`}>
                    {totalMatches}
                  </span>
                )}
                {tab === 'Posts' && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'}`}>
                    {posts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'Matches' && (
          games.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No matches yet</div>
            : <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
                {games.map(game => <MatchRow key={game.id} game={game} />)}
              </div>
        )}

        {activeTab === 'Posts' && (
          posts.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No posts yet</div>
            : <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
                {posts.map(post => <PostRow key={post.id} post={post} />)}
              </div>
        )}

        {activeTab === 'Stats' && (
          <div className="space-y-6">
            {/* Sport breakdown */}
            {Object.keys(sportBreakdown).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Swords size={13} className="text-accent" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">Sports Played</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sportBreakdown).sort((a, b) => b[1] - a[1]).map(([sport, count]) => {
                    const sportObj = SPORTS.find(s => s.id === sport)
                    return (
                      <div key={sport} className="glass px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
                        <span>{sportObj?.emoji}</span>
                        <span className="text-[10px] font-black uppercase text-accent">{sportObj?.label || sport}</span>
                        <span className="text-[9px] text-ink-500 font-bold">{count}x</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ELO ratings — mirrors ProfilePage */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-accent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">ELO Ratings</p>
              </div>
              {eloRatings.length === 0 ? (
                <div className="glass rounded-2xl border border-white/10 p-5 text-center">
                  <p className="text-ink-600 text-xs font-black uppercase tracking-widest">No ELO yet</p>
                  <p className="text-ink-700 text-xs mt-1">Play ranked matches to earn a rating</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eloRatings.map(r => (
                    <EloRow key={r.sport} sport={r.sport} elo={r.elo_rating} wins={r.wins} losses={r.losses} />
                  ))}
                </div>
              )}
            </div>

            {/* Reputation — mirrors ProfilePage */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={13} className="text-accent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                  Reputation
                  {hasReputation && (
                    <span className="ml-2 text-ink-700">
                      · {profile.rating_count} rating{profile.rating_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              {!hasReputation ? (
                <div className="glass rounded-2xl border border-white/10 p-5 text-center">
                  <p className="text-ink-600 text-xs font-black uppercase tracking-widest">No ratings yet</p>
                  <p className="text-ink-700 text-xs mt-1">Play matches to get rated by opponents</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <ReputationBadge label="Skill"         value={profile.avg_skill}         emoji="🎯" />
                  <ReputationBadge label="Sportsmanship" value={profile.avg_sportsmanship}  emoji="🤝" />
                  <ReputationBadge label="Reliability"   value={profile.avg_reliability}    emoji="⏰" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
