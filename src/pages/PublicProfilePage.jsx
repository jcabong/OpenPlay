import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin, ArrowLeft, Star, X } from 'lucide-react'

const TIER_STYLE = {
  Diamond:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)'  },
  Platinum: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)' },
  Gold:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.25)'  },
  Silver:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
  Bronze:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.20)'  },
  Casual:   { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
}
function tierStyle(tier) { return TIER_STYLE[tier] || TIER_STYLE.Casual }

// ─── Rating Modal ─────────────────────────────────────────────────────────────
const RATING_DIMS = [
  { key: 'skill',         label: 'Skill Level',   emoji: '🎯', desc: 'How skilled is this player?' },
  { key: 'sportsmanship', label: 'Sportsmanship', emoji: '🤝', desc: 'Fair play & attitude'        },
  { key: 'reliability',   label: 'Reliability',   emoji: '⏰', desc: 'Shows up on time, committed?' },
]

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-3 justify-center">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110 active:scale-95">
          <Star size={36}
            style={{
              fill:   s <= (hovered || value) ? '#c8ff00' : 'transparent',
              stroke: s <= (hovered || value) ? '#c8ff00' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.1s',
            }} />
        </button>
      ))}
    </div>
  )
}

const STAR_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent']

function RatingModal({ targetUser, currentUser, gameId, onClose, onDone }) {
  const [step, setStep]       = useState(0)
  const [ratings, setRatings] = useState({ skill: 0, sportsmanship: 0, reliability: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const dim       = RATING_DIMS[step]
  const isLast    = step === RATING_DIMS.length - 1
  const canNext   = ratings[dim.key] > 0

  async function handleSubmit() {
    setSubmitting(true)
    const { error } = await supabase.from('player_ratings').insert([{
      rated_user_id: targetUser.id,
      rater_user_id: currentUser.id,
      game_id:       gameId || null,
      skill:         ratings.skill,
      sportsmanship: ratings.sportsmanship,
      reliability:   ratings.reliability,
    }])
    setSubmitting(false)
    if (!error) { setSubmitted(true); setTimeout(() => { onDone(); onClose() }, 1500) }
  }

  function handleNext() {
    if (isLast) { handleSubmit() }
    else        { setStep(s => s + 1) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center">
      <div className="w-full max-w-md rounded-t-[2.5rem] p-8 border border-white/10 animate-slide-up"
        style={{ background: '#0f0f1a' }}>

        {submitted ? (
          <div className="text-center py-8">
            <p className="text-5xl mb-4">⭐</p>
            <p className="font-black text-white text-lg uppercase italic">Thanks for rating!</p>
            <p className="text-ink-400 text-sm mt-2">Helps the community know who's great to play with.</p>
          </div>
        ) : (
          <>
            {/* Progress dots */}
            <div className="flex gap-2 justify-center mb-6">
              {RATING_DIMS.map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === step ? '24px' : '8px', background: i <= step ? '#c8ff00' : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-bold uppercase italic text-white">
                Rate @{targetUser?.username}
              </h2>
              <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200">
                <X size={20} />
              </button>
            </div>

            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
                style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
                {dim.emoji}
              </div>
              <h3 className="font-black text-white text-base mb-1">{dim.label}</h3>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {dim.desc}
              </p>
            </div>

            <div className="mb-6">
              <StarPicker value={ratings[dim.key]} onChange={val => setRatings(r => ({ ...r, [dim.key]: val }))} />
              {ratings[dim.key] > 0 && (
                <p className="text-center text-xs font-black uppercase tracking-widest mt-3" style={{ color: '#c8ff00' }}>
                  {STAR_LABELS[ratings[dim.key]]}
                </p>
              )}
            </div>

            {/* Summary of previous steps */}
            {step > 0 && (
              <div className="flex gap-4 justify-center mb-6">
                {RATING_DIMS.slice(0, step).map(d => (
                  <div key={d.key} className="text-center">
                    <p className="text-sm">{d.emoji}</p>
                    <div className="flex gap-0.5 mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={8}
                          style={{ fill: s <= ratings[d.key] ? '#c8ff00' : 'transparent', stroke: s <= ratings[d.key] ? '#c8ff00' : 'rgba(255,255,255,0.2)' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-4 glass rounded-2xl text-ink-500 font-bold text-xs uppercase tracking-widest border border-white/10">
                Skip
              </button>
              <button onClick={handleNext} disabled={!canNext || submitting}
                className="flex-1 py-4 rounded-2xl font-display font-bold uppercase italic tracking-tight disabled:opacity-40 transition-all"
                style={{ background: '#c8ff00', color: '#0a0a0f' }}>
                {submitting ? 'Saving…' : isLast ? 'Submit Rating' : 'Next →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-red-500/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-100 truncate">
          {sport?.label}
          {game.opponent_name && <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>}
        </p>
        {(game.court_name || game.city) && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{[game.court_name, game.city].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-red-400'}`}>{isWin ? 'WIN' : 'LOSS'}</p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

// ─── ELO Sport Card ───────────────────────────────────────────────────────────
function EloSportCard({ sportId, eloRows }) {
  const sport = SPORTS.find(s => s.id === sportId)
  const row   = eloRows.find(r => r.sport === sportId)
  if (!row) return (
    <div className="glass p-3 rounded-2xl border border-white/5 text-center opacity-35">
      <p className="text-lg mb-1">{sport?.emoji || '🏸'}</p>
      <p className="text-[8px] font-black uppercase text-ink-600">{sport?.label}</p>
      <p className="text-[9px] text-ink-700 mt-1">Unranked</p>
    </div>
  )
  const ts = tierStyle(row.skill_tier)
  return (
    <div className="p-3 rounded-2xl border text-center" style={{ background: ts.bg, borderColor: ts.border }}>
      <p className="text-lg mb-0.5">{sport?.emoji || '🏸'}</p>
      <p className="font-display text-xl font-bold italic" style={{ color: ts.color }}>{row.elo_rating}</p>
      <p className="text-[8px] font-black uppercase tracking-wider mt-0.5" style={{ color: ts.color, opacity: 0.8 }}>{row.skill_tier}</p>
      <p className="text-[9px] text-ink-600 mt-1">{row.wins}W · {row.losses}L</p>
    </div>
  )
}

// ─── Star Display ─────────────────────────────────────────────────────────────
function StarDisplay({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-black uppercase text-ink-600 mb-1">{label}</p>
      <div className="flex gap-0.5 justify-center">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={10}
            style={{ fill: s <= Math.round(value) ? '#c8ff00' : 'transparent', stroke: s <= Math.round(value) ? '#c8ff00' : 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PublicProfilePage() {
  const { userId }    = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const [profile, setProfile]     = useState(null)
  const [games, setGames]         = useState([])
  const [posts, setPosts]         = useState([])
  const [eloRows, setEloRows]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeSport, setActiveSport] = useState('all')
  const [activeTab, setActiveTab]     = useState('Matches')
  const [showRating, setShowRating]   = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)

  useEffect(() => { if (userId) fetchData() }, [userId])

  async function fetchData() {
    setLoading(true)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const { data: u } = await supabase
      .from('users').select('*')
      .eq(isUUID ? 'id' : 'username', userId)
      .single()

    if (!u) { setLoading(false); return }
    setProfile(u)

    const [{ data: g }, { data: po }, { data: elo }, { data: myRating }] = await Promise.all([
      supabase.from('games')
        .select('id, sport, result, score, court_name, city, opponent_name, created_at')
        .eq('user_id', u.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('posts')
        .select('id, content, sport, location_name, media_urls, inserted_at')
        .eq('author_id', u.id)
        .eq('is_deleted', false)
        .order('inserted_at', { ascending: false })
        .limit(20),
      supabase.from('player_elo')
        .select('sport, elo_rating, wins, losses, matches_played, skill_tier')
        .eq('user_id', u.id),
      user
        ? supabase.from('player_ratings')
            .select('id')
            .eq('rated_user_id', u.id)
            .eq('rater_user_id', user.id)
            .limit(1)
        : Promise.resolve({ data: [] }),
    ])

    setGames(g || [])
    setPosts(po || [])
    setEloRows(elo || [])
    setAlreadyRated((myRating || []).length > 0)
    setLoading(false)
  }

  const filteredGames = activeSport === 'all' ? games : games.filter(g => g.sport === activeSport)
  const wins     = filteredGames.filter(g => g.result === 'win').length
  const losses   = filteredGames.filter(g => g.result === 'loss').length
  const total    = filteredGames.length
  const winRate  = total > 0 ? Math.round((wins / total) * 100) : 0
  const isOwnProfile = user?.id === profile?.id

  if (loading) return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-accent/10 flex items-center justify-center">
          <span className="text-2xl">🏸</span>
        </div>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center text-ink-50 gap-4">
      <p className="text-ink-400 text-sm">Player not found</p>
      <button onClick={() => navigate(-1)} className="text-accent text-xs font-black uppercase">← Go Back</button>
    </div>
  )

  const displayName = profile.display_name || profile.username || 'Player'
  const hasAvatar   = profile.avatar_url && profile.avatar_type !== 'initials'
  const initial     = (profile.username || 'P').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-5 pt-6">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors mb-6 text-[10px] font-black uppercase tracking-widest">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="shrink-0">
          {hasAvatar
            ? <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-white/10" />
            : <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">{initial}</div>
          }
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
          {profile.bio && <p className="text-ink-400 text-xs mt-1 line-clamp-2">{profile.bio}</p>}
        </div>
      </div>

      {/* Community ratings display */}
      {profile.rating_count > 0 && (
        <div className="mb-4 flex items-center gap-4 p-3 rounded-2xl border border-white/8"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <StarDisplay value={profile.avg_skill || 0}         label="Skill"          />
          <StarDisplay value={profile.avg_sportsmanship || 0} label="Sportsmanship"  />
          <StarDisplay value={profile.avg_reliability || 0}   label="Reliability"    />
          <p className="text-[9px] text-ink-600 ml-auto shrink-0">{profile.rating_count} ratings</p>
        </div>
      )}

      {/* Rate button — only shown to logged-in users viewing someone else's profile */}
      {user && !isOwnProfile && (
        <div className="mb-5">
          {alreadyRated ? (
            <div className="py-2.5 text-center rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-ink-500">
              ✓ You've rated this player
            </div>
          ) : (
            <button onClick={() => setShowRating(true)}
              className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.25)', color: '#c8ff00' }}>
              <Star size={13} /> Rate This Player
            </button>
          )}
        </div>
      )}

      {/* Per-sport ELO grid */}
      <div className="mb-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3 flex items-center gap-2">
          <Trophy size={11} className="text-accent" /> ELO Ratings
        </p>
        <div className="grid grid-cols-4 gap-2">
          {SPORTS.map(s => <EloSportCard key={s.id} sportId={s.id} eloRows={eloRows} />)}
        </div>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
        {[{ id: 'all', label: 'All', emoji: '' }, ...SPORTS].map(s => (
          <button key={s.id} onClick={() => setActiveSport(s.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
              activeSport === s.id ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'
            }`}>
            {s.emoji ? `${s.emoji} ` : ''}{s.label}
          </button>
        ))}
      </div>

      {/* Stats card */}
      <div className="glass p-5 rounded-[2rem] border border-white/10 mb-5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-3 border-b border-white/5 pb-2">
          <span className="flex items-center gap-2"><Trophy size={12} className="text-accent" />
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
            <p className="text-2xl font-display font-bold text-red-400">{losses}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Losses</p>
          </div>
        </div>
        {total > 0 && (
          <div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${winRate}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-ink-600 font-black uppercase">{wins}W</span>
              <span className="text-[8px] text-ink-600 font-black uppercase">{losses}L</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl overflow-hidden border border-white/10 glass mb-4">
        {['Matches', 'Posts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400'
            }`}>
            {tab === 'Matches' ? <Trophy size={12} /> : <Clock size={12} />}
            {tab}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'}`}>
              {tab === 'Matches' ? filteredGames.length : posts.length}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'Matches' && (
        filteredGames.length === 0
          ? <div className="text-center py-12 text-ink-600 text-xs font-black uppercase tracking-widest">No matches yet</div>
          : <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {filteredGames.map(g => <MatchRow key={g.id} game={g} />)}
            </div>
      )}

      {activeTab === 'Posts' && (
        posts.length === 0
          ? <div className="text-center py-12 text-ink-600 text-xs font-black uppercase tracking-widest">No posts yet</div>
          : <div className="space-y-3">
              {posts.map(post => {
                const sport   = SPORTS.find(s => s.id === post.sport)
                const dateVal = post.inserted_at
                return (
                  <div key={post.id} className="glass p-4 rounded-[1.5rem] border border-white/5">
                    {sport && <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 block">{sport.emoji} {sport.label}</span>}
                    {post.content && <p className="text-sm text-ink-100 leading-relaxed line-clamp-3">{post.content}</p>}
                    {post.media_urls?.length > 0 && <p className="text-[9px] text-ink-600 font-bold mt-1">📎 {post.media_urls.length} media</p>}
                    <div className="flex items-center justify-between mt-2">
                      {post.location_name
                        ? <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5"><MapPin size={8} className="text-accent" />{post.location_name}</p>
                        : <span />}
                      <p className="text-[9px] text-ink-700">{dateVal ? new Date(dateVal).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {showRating && user && (
        <RatingModal
          targetUser={profile}
          currentUser={user}
          gameId={null}
          onClose={() => setShowRating(false)}
          onDone={() => { setAlreadyRated(true); fetchData() }}
        />
      )}
    </div>
  )
}
