import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, MapPin, ArrowLeft, Loader2, TrendingUp, Star, MessageSquare } from 'lucide-react'

// Same colour constants as ProfilePage for consistency
const C = {
  white:      '#ffffff',
  accent:     '#c8ff00',
  spark:      '#ff4d4d',
  dim1:       'rgba(255,255,255,0.7)',
  dim2:       'rgba(255,255,255,0.5)',
  dim3:       'rgba(255,255,255,0.35)',
  dim4:       'rgba(255,255,255,0.2)',
  surface:    'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.1)',
  borderDim:  'rgba(255,255,255,0.06)',
}

function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: C.borderDim }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
        style={{ background: isWin ? 'rgba(200,255,0,0.1)' : 'rgba(255,77,77,0.1)' }}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: C.white }}>
          {sport?.label || game.sport}
          {game.opponent_name && <span className="font-normal" style={{ color: C.dim2 }}> vs {game.opponent_name}</span>}
        </p>
        {game.court_name && (
          <p className="text-[10px] font-bold flex items-center gap-1 mt-0.5" style={{ color: C.dim3 }}>
            <MapPin size={8} />{game.court_name}{game.city ? ` · ${game.city}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-black uppercase" style={{ color: isWin ? C.accent : C.spark }}>{isWin ? 'WIN' : 'LOSS'}</p>
        {game.score && <p className="text-[10px]" style={{ color: C.dim3 }}>{game.score}</p>}
        <p className="text-[9px] mt-0.5" style={{ color: C.dim4 }}>
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
    <div className="flex items-start gap-3 p-4 border-b" style={{ borderColor: C.borderDim }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ background: C.surface }}>
        {sport ? sport.emoji : '💬'}
      </div>
      <div className="flex-1 min-w-0">
        {sport && <span className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: C.accent }}>{sport.label}</span>}
        {post.content && <p className="text-sm leading-relaxed line-clamp-2" style={{ color: C.dim1 }}>{post.content}</p>}
        {hasMedia && <p className="text-[9px] font-bold mt-1" style={{ color: C.dim3 }}>📎 {post.media_urls.length} media</p>}
        {post.location_name && (
          <p className="text-[9px] font-bold flex items-center gap-1 mt-0.5" style={{ color: C.dim3 }}>
            <MapPin size={8} />{post.location_name}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-bold justify-end" style={{ color: C.dim3 }}>
          <MessageSquare size={10} />{post.comments?.length || 0}
        </div>
        <p className="text-[9px] mt-1" style={{ color: C.dim4 }}>
          {new Date(post.inserted_at || post.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function EloRow({ sport, elo, wins, losses }) {
  const sportObj = SPORTS.find(s => s.id === sport)
  const tier = elo >= 1400 ? { label: 'Elite',    color: '#f59e0b' }
             : elo >= 1200 ? { label: 'Advanced', color: '#c8ff00' }
             : elo >= 1100 ? { label: 'Skilled',  color: '#60a5fa' }
             : elo >= 1000 ? { label: 'Ranked',   color: '#a78bfa' }
             :               { label: 'Rookie',   color: 'rgba(255,255,255,0.5)' }
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border" style={{ background: C.surface, borderColor: C.borderDim }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{sportObj?.emoji}</span>
        <div>
          <p className="text-xs font-black" style={{ color: C.white }}>{sportObj?.label}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tier.color }}>{tier.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-xl italic leading-none" style={{ color: tier.color }}>{elo}</p>
        <p className="text-[9px]" style={{ color: C.dim3 }}>{wins}W · {losses}L</p>
      </div>
    </div>
  )
}

function ReputationBadge({ label, value, emoji }) {
  const stars = Math.round(value || 0)
  return (
    <div className="flex-1 p-3 rounded-2xl border text-center" style={{ background: C.surface, borderColor: C.borderDim }}>
      <p className="text-base mb-1">{emoji}</p>
      <p className="font-display font-bold text-lg leading-none" style={{ color: C.accent }}>
        {value > 0 ? Number(value).toFixed(1) : '—'}
      </p>
      <div className="flex justify-center gap-0.5 my-1">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={8} style={{ fill: s <= stars ? C.accent : 'transparent', stroke: s <= stars ? C.accent : C.dim4 }} />
        ))}
      </div>
      <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: C.dim3 }}>{label}</p>
    </div>
  )
}

const TABS = ['Matches', 'Posts', 'Stats']

export default function PublicProfilePage() {
  const { userId }            = useParams()
  const { user: currentUser } = useAuth()
  const navigate              = useNavigate()

  const [profile, setProfile]       = useState(null)
  const [games, setGames]           = useState([])
  const [posts, setPosts]           = useState([])
  const [eloRatings, setEloRatings] = useState([])
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [activeTab, setActiveTab]   = useState('Matches')

  // Redirect to own profile
  useEffect(() => {
    if (currentUser && userId === currentUser.id) navigate('/profile', { replace: true })
  }, [currentUser, userId, navigate])

  useEffect(() => {
    if (userId && (!currentUser || userId !== currentUser.id)) fetchData()
  }, [userId, currentUser])

  async function fetchData() {
    setLoading(true); setNotFound(false)
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

      // Fetch profile — include reputation & ELO fields
      const { data: p, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, avatar_type, city, region, bio, created_at, elo_rating, skill_tier, avg_skill, avg_sportsmanship, avg_reliability, rating_count')
        [isUUID ? 'eq' : 'eq'](...(isUUID ? ['id', userId] : ['username', userId]))
        .maybeSingle()

      if (error || !p) { setNotFound(true); setLoading(false); return }
      setProfile(p)

      // Fetch all data in parallel — same queries as ProfilePage
      const [{ data: g }, { data: po }, { data: elo }] = await Promise.all([
        supabase.from('games')
          .select('*')
          .or(`user_id.eq.${p.id},tagged_opponent_id.eq.${p.id}`)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false }),
        supabase.from('posts')
          .select('*, comments(id)')
          .eq('author_id', p.id)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
          .limit(30),
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
      console.error('PublicProfile fetchData error:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: C.accent }} />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0a0a0f' }}>
        <div className="text-6xl">🏸</div>
        <h2 className="font-display text-2xl font-bold uppercase italic" style={{ color: C.white }}>Player not found</h2>
        <p className="text-sm text-center" style={{ color: C.dim2 }}>This player might have left the court.</p>
        <button onClick={() => navigate(-1)}
          className="mt-4 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border"
          style={{ color: C.accent, borderColor: 'rgba(200,255,0,0.2)', background: 'rgba(200,255,0,0.06)' }}>
          Go Back
        </button>
      </div>
    )
  }

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalLosses  = games.filter(g => g.result === 'loss').length
  const totalMatches = games.length
  const winRate      = totalMatches > 0 ? Math.round(totalWins / totalMatches * 100) : 0
  const initial      = (profile?.username || 'U').charAt(0).toUpperCase()
  const hasAvatar    = profile?.avatar_url && profile?.avatar_type !== 'initials'
  const hasReputation = (profile?.rating_count || 0) > 0

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0a0a0f' }}>
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderColor: C.borderDim }}>
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl border"
          style={{ background: C.surface, borderColor: C.border, color: C.dim2 }}>
          <ArrowLeft size={18} />
        </button>
        <span className="font-display font-bold text-sm uppercase italic" style={{ color: C.dim1 }}>
          @{profile?.username}
        </span>
      </div>

      <div className="px-5 pt-8">
        {/* Avatar + name */}
        <div className="flex flex-col items-center mb-6">
          {hasAvatar
            ? <img src={profile.avatar_url} alt="avatar" className="w-24 h-24 rounded-[2rem] object-cover border-2 border-accent mb-4" />
            : <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center font-bold text-4xl border mb-4"
                style={{ background: 'rgba(200,255,0,0.08)', borderColor: 'rgba(200,255,0,0.2)', color: C.accent }}>
                {initial}
              </div>}
          <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight" style={{ color: C.white }}>
            {profile?.display_name || `@${profile?.username}`}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: C.accent }}>
            @{profile?.username}
          </p>
          {(profile?.city || profile?.region) && (
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold" style={{ color: C.dim2 }}>
              <MapPin size={10} style={{ color: C.accent }} />
              {[profile?.city, profile?.region].filter(Boolean).join(', ')}
            </div>
          )}
          {profile?.bio && (
            <p className="text-sm mt-3 text-center leading-relaxed max-w-sm" style={{ color: C.dim1 }}>{profile.bio}</p>
          )}
          <p className="text-[9px] uppercase font-black tracking-widest mt-2" style={{ color: C.dim3 }}>
            Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Stats grid — identical layout to ProfilePage */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { val: totalWins,     label: 'Wins'     },
            { val: `${winRate}%`, label: 'Win Rate' },
            { val: totalMatches,  label: 'Matches'  },
          ].map(({ val, label }) => (
            <div key={label} className="p-3.5 rounded-[1.25rem] border text-center glass" style={{ borderColor: C.borderDim }}>
              <p className="font-display text-2xl font-bold italic" style={{ color: C.accent }}>{val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: C.dim3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Win/loss bar */}
        {totalMatches > 0 && (
          <div className="mb-5">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surface }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${winRate}%`, background: C.accent }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-black uppercase" style={{ color: C.accent }}>{totalWins}W</span>
              <span className="text-[9px] font-black uppercase" style={{ color: C.spark }}>{totalLosses}L</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex rounded-2xl overflow-hidden border glass" style={{ borderColor: C.border }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                style={activeTab === tab ? { background: C.accent, color: '#0a0a0f' } : { color: C.dim2 }}>
                {tab === 'Matches' && <Trophy size={12} />}
                {tab === 'Posts'   && <MessageSquare size={12} />}
                {tab === 'Stats'   && <TrendingUp size={12} />}
                {tab}
                {tab === 'Matches' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={activeTab === tab ? { background: 'rgba(10,10,15,0.2)', color: '#0a0a0f' } : { background: C.surface, color: C.dim3 }}>
                    {totalMatches}
                  </span>
                )}
                {tab === 'Posts' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={activeTab === tab ? { background: 'rgba(10,10,15,0.2)', color: '#0a0a0f' } : { background: C.surface, color: C.dim3 }}>
                    {posts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — mirrors ProfilePage exactly */}
        {activeTab === 'Matches' && (
          games.length === 0
            ? <div className="text-center py-14 text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No matches yet</div>
            : <div className="rounded-[2rem] border overflow-hidden glass" style={{ borderColor: C.border }}>
                {games.map(g => <MatchRow key={g.id} game={g} />)}
              </div>
        )}

        {activeTab === 'Posts' && (
          posts.length === 0
            ? <div className="text-center py-14 text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No posts yet</div>
            : <div className="rounded-[2rem] border overflow-hidden glass" style={{ borderColor: C.border }}>
                {posts.map(p => <PostRow key={p.id} post={p} />)}
              </div>
        )}

        {activeTab === 'Stats' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} style={{ color: C.accent }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>ELO Ratings</p>
              </div>
              {eloRatings.length === 0 ? (
                <div className="rounded-2xl border p-5 text-center glass" style={{ borderColor: C.border }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No ELO yet</p>
                  <p className="text-xs mt-1" style={{ color: C.dim4 }}>Play ranked matches to earn a rating</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eloRatings.map(r => <EloRow key={r.sport} sport={r.sport} elo={r.elo_rating} wins={r.wins} losses={r.losses} />)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={13} style={{ color: C.accent }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>
                  Reputation
                  {hasReputation && <span className="ml-2" style={{ color: C.dim3 }}>· {profile.rating_count} rating{profile.rating_count !== 1 ? 's' : ''}</span>}
                </p>
              </div>
              {!hasReputation ? (
                <div className="rounded-2xl border p-5 text-center glass" style={{ borderColor: C.border }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No ratings yet</p>
                  <p className="text-xs mt-1" style={{ color: C.dim4 }}>Play matches to get rated by opponents</p>
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
