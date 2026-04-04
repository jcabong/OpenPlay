import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapPin, Trophy, ArrowLeft, Loader2, Image, Calendar, Swords } from 'lucide-react'
import PostCard from '../components/PostCard'

const TABS = ['Posts', 'Match Logs']

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
          {game.opponent_name
            ? <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>
            : ''}
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
  const { username } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [h2h, setH2h] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Posts')
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: usr } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (!usr) { setNotFound(true); setLoading(false); return }
    setProfile(usr)

    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from('games')
        .select('*')
        .eq('user_id', usr.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('posts')
        .select('*, author:users!posts_author_id_fkey(id,username), likes(user_id), comments(*, users(username))')
        .eq('author_id', usr.id)
        .eq('is_deleted', false)
        .order('inserted_at', { ascending: false }),
    ])
    setGames(g || [])
    setPosts(p || [])

    if (user && user.id !== usr.id) {
      const { data: myGames } = await supabase
        .from('games')
        .select('result, tagged_opponent_id')
        .eq('user_id', user.id)
        .eq('tagged_opponent_id', usr.id)
        .eq('is_deleted', false)

      if (myGames?.length) {
        const myWins = myGames.filter(g => g.result === 'win').length
        const myLosses = myGames.filter(g => g.result === 'loss').length
        setH2h({ wins: myWins, losses: myLosses, total: myGames.length })
      }
    }

    setLoading(false)
  }, [username, user])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">👤</p>
        <p className="text-ink-300 font-black uppercase tracking-widest text-sm">Player not found</p>
        <p className="text-ink-600 text-xs mt-1 mb-6">@{username} doesn't exist</p>
        <Link to="/" className="text-accent text-xs font-black uppercase tracking-widest hover:underline">← Back to Feed</Link>
      </div>
    )
  }

  const totalWins = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0
  const sportStats = SPORTS.map(s => {
    const sg = games.filter(g => g.sport === s.id)
    const wins = sg.filter(g => g.result === 'win').length
    return { ...s, total: sg.length, wins, rate: sg.length ? Math.round(wins / sg.length * 100) : 0 }
  }).filter(s => s.total > 0)

  const initial = (profile.username || 'P').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      <div className="px-5 pt-14 pb-2">
        <Link to="/" className="flex items-center gap-1.5 text-ink-500 text-xs font-black uppercase tracking-widest hover:text-accent transition-colors w-fit">
          <ArrowLeft size={14} /> Feed
        </Link>
      </div>

      <div className="relative h-32 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 overflow-hidden mx-4 rounded-[2rem]">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(#C8FF00 1px,transparent 1px),linear-gradient(90deg,#C8FF00 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="px-5 pb-4 -mt-10">
        <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl border-4 border-ink-900 glow-accent mb-3">
          {initial}
        </div>
        <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter text-white leading-none">
          {profile.display_name || `@${profile.username}`}
        </h1>
        <p className="text-accent text-sm font-bold mt-0.5">@{profile.username}</p>
        {(profile.city || profile.region) && (
          <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-1.5">
            <MapPin size={11} className="text-accent" />
            {[profile.city, profile.region].filter(Boolean).join(', ')}
          </div>
        )}
        {profile.bio && (
          <p className="text-ink-300 text-sm mt-3 leading-relaxed max-w-sm">{profile.bio}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { num: totalWins, lbl: 'Wins' },
          { num: `${winRate}%`, lbl: 'Win Rate' },
          { num: totalMatches, lbl: 'Matches' },
        ].map(s => (
          <div key={s.lbl} className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
            <p className="font-display text-2xl font-bold text-accent italic leading-none">{s.num}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">{s.lbl}</p>
          </div>
        ))}
      </div>

      {h2h && h2h.total > 0 && (
        <div className="px-4 mb-4">
          <div className="glass p-4 rounded-[1.5rem] border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(200,255,0,0.1)' }}>
              <Swords size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1">Your Head-to-Head</p>
              <p className="text-sm font-black text-white">
                <span className="text-accent">{h2h.wins}W</span>
                <span className="text-ink-600 mx-1.5">·</span>
                <span className="text-spark">{h2h.losses}L</span>
                <span className="text-ink-600 text-xs font-bold ml-2">vs @{profile.username}</span>
              </p>
            </div>
            <p className="text-[10px] font-black text-ink-600 shrink-0">{h2h.total} matches</p>
          </div>
        </div>
      )}

      {sportStats.length > 0 && (
        <div className="px-4 mb-5">
          <div className="glass p-5 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">Sport Breakdown</p>
            </div>
            <div className="space-y-4">
              {sportStats.map(s => (
                <div key={s.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">{s.emoji} {s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-ink-600 font-bold">{s.wins}W · {s.total - s.wins}L</span>
                      <span className="text-accent font-black text-sm">{s.rate}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${s.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="glass flex rounded-2xl overflow-hidden border border-white/10">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-500 hover:text-ink-200'
              }`}
            >
              {tab === 'Posts' && <Image size={12} />}
              {tab === 'Match Logs' && <Calendar size={12} />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Posts' && (
        <div className="px-4 space-y-4">
          {posts.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No posts yet</div>
            : posts.map(post => <PostCard key={post.id} post={post} onRefresh={load} />)
          }
        </div>
      )}

      {activeTab === 'Match Logs' && (
        <div className="px-4">
          {games.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No matches yet</div>
            : (
              <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
                {games.map(game => <MatchRow key={game.id} game={game} />)}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}