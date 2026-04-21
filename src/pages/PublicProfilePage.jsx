import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Clock, MapPin, ArrowLeft, Star } from 'lucide-react'

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

export default function PublicProfilePage() {
  const { idOrUsername } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSport, setActiveSport] = useState('all')
  const [activeTab, setActiveTab] = useState('Matches')

  useEffect(() => {
    if (idOrUsername) fetchData()
  }, [idOrUsername])

  async function fetchData() {
    setLoading(true)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrUsername)

    const { data: u, error: uErr } = await supabase
      .from('users')
      .select('*')
      .eq(isUUID ? 'id' : 'username', idOrUsername)
      .single()

    if (!u || uErr) { 
        setLoading(false)
        return 
    }
    setProfile(u)

    const [{ data: g }, { data: po }] = await Promise.all([
      supabase
        .from('games')
        .select('*')
        .eq('user_id', u.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('*')
        .eq('author_id', u.id)
        .eq('is_deleted', false)
        .order('inserted_at', { ascending: false })
        .limit(20),
    ])

    setGames(g || [])
    setPosts(po || [])
    setLoading(false)
  }

  const filteredGames = activeSport === 'all' ? games : games.filter(g => g.sport === activeSport)
  const wins = filteredGames.filter(g => g.result === 'win').length
  const losses = filteredGames.filter(g => g.result === 'loss').length
  const total = filteredGames.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const currentElo = activeSport === 'all' 
    ? (profile?.elo_rating || 1200) 
    : (profile?.[`${activeSport}_elo`] || 1200)

  const currentTier = activeSport === 'all'
    ? (profile?.skill_tier || 'Casual')
    : (profile?.[`${activeSport}_tier`] || 'Casual')

  const eloColor = ELO_TIER_COLOR[currentTier.split(' ')[0]] || 'rgba(255,255,255,0.45)'

  if (loading) return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center font-display uppercase italic text-accent font-black animate-pulse">
      Loading Profile...
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-ink-400 mb-4 font-bold text-sm">Player not found.</p>
      <button onClick={() => navigate(-1)} className="text-accent text-[10px] font-black uppercase tracking-widest border border-accent/20 px-6 py-2 rounded-full bg-accent/5">Go Back</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-ink-400 mb-8 text-[10px] font-black uppercase tracking-widest hover:text-accent transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-5 mb-8">
        <div className="shrink-0">
          {profile.avatar_url && profile.avatar_type !== 'initials' ? (
            <img src={profile.avatar_url} className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-white/10" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">
              {(profile.display_name || profile.username || 'P').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold uppercase italic text-white truncate leading-none mb-1">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-accent text-sm font-bold leading-none mb-3">@{profile.username}</p>
          <div className="flex items-center gap-1.5 text-ink-500 text-[10px] font-bold">
            <MapPin size={10} className="text-accent shrink-0" />
            <span className="truncate">{[profile.city, profile.province].filter(Boolean).join(', ') || 'Philippines'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
        {[{ id: 'all', label: 'All', emoji: '🌟' }, ...SPORTS].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSport(s.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
              activeSport === s.id ? 'bg-accent text-ink-900 border-accent shadow-[0_0_15px_-5px_#C8FF00]' : 'bg-white/5 border-white/10 text-ink-500 hover:text-ink-100'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass p-5 rounded-[1.5rem] border border-white/5">
          <p className="text-[8px] font-black uppercase text-ink-600 mb-1 tracking-widest">Wins</p>
          <p className="text-3xl font-display font-bold text-accent italic leading-none">{wins}</p>
        </div>
        <div className="glass p-5 rounded-[1.5rem] border border-white/5">
          <p className="text-[8px] font-black uppercase text-ink-600 mb-1 tracking-widest">Losses</p>
          <p className="text-3xl font-display font-bold text-spark italic leading-none">{losses}</p>
        </div>
        <div className="glass p-5 rounded-[1.5rem] border border-white/5">
          <p className="text-[8px] font-black uppercase text-ink-600 mb-1 tracking-widest">Win Rate</p>
          <p className="text-3xl font-display font-bold text-white italic leading-none">{winRate}%</p>
        </div>
        <div className="glass p-5 rounded-[1.5rem] border border-accent/20 bg-accent/[0.03]">
          <p className="text-[8px] font-black uppercase text-accent mb-1 tracking-widest">Rating & Tier</p>
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="text-3xl font-display font-bold italic leading-none shrink-0" style={{ color: eloColor }}>{currentElo}</p>
            <p className="text-[9px] font-black uppercase truncate" style={{ color: eloColor }}>{currentTier}</p>
          </div>
        </div>
      </div>

      <div className="flex rounded-2xl overflow-hidden border border-white/10 glass mb-6">
        {['Matches', 'Posts'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {tab} ({tab === 'Matches' ? filteredGames.length : posts.length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {activeTab === 'Matches' ? (
          filteredGames.length === 0 ? (
            <div className="text-center py-16 text-ink-700 text-xs font-black uppercase tracking-widest">No matches found</div>
          ) : (
            <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {filteredGames.map(game => <MatchRow key={game.id} game={game} />)}
            </div>
          )
        ) : (
          posts.length === 0 ? (
            <div className="text-center py-16 text-ink-700 text-xs font-black uppercase tracking-widest">No posts yet</div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="glass p-5 rounded-[1.8rem] border border-white/5">
                {post.media_urls?.length > 0 && (
                   <img src={post.media_urls[0]} className="w-full aspect-video object-cover rounded-2xl mb-4 border border-white/5" alt="" />
                )}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-accent text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> {post.sport || 'General'}
                    </span>
                    <span className="text-ink-700 text-[9px] font-bold">
                        {new Date(post.inserted_at).toLocaleDateString()}
                    </span>
                </div>
                {post.content && <p className="text-sm text-ink-100 leading-relaxed font-medium">{post.content}</p>}
                {post.location_name && (
                    <div className="flex items-center gap-1 mt-3 text-ink-600 text-[9px] font-bold uppercase">
                        <MapPin size={9} className="text-accent" /> {post.location_name}
                    </div>
                )}
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}