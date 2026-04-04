import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapPin, Trophy, ArrowLeft, Loader2, Image, Calendar, Swords } from 'lucide-react'
import PostCard from '../components/PostCard'

function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-spark/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {sport?.label} {game.opponent_name && <span className="text-white/40 font-normal">vs {game.opponent_name}</span>}
        </p>
        <p className="text-[9px] text-white/60 font-bold flex items-center gap-0.5 mt-0.5">
          <MapPin size={8} /> {game.court_name || 'Outdoor Court'}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>{game.result}</p>
        <p className="text-[10px] text-white/40">{game.score}</p>
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

  const load = useCallback(async () => {
    setLoading(true)
    const { data: usr } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (!usr) { setLoading(false); return }
    setProfile(usr)

    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from('games').select('*').eq('user_id', usr.id).eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('posts').select('*, author:profiles(id,username), likes(user_id), comments(*, profiles(username))').eq('author_id', usr.id).eq('is_deleted', false).order('inserted_at', { ascending: false })
    ])
    setGames(g || [])
    setPosts(p || [])

    if (user && user.id !== usr.id) {
      const { data: myGames } = await supabase.from('games').select('result').eq('user_id', user.id).eq('tagged_opponent_id', usr.id).eq('is_deleted', false)
      if (myGames?.length) {
        setH2h({ wins: myGames.filter(x => x.result === 'win').length, losses: myGames.filter(x => x.result === 'loss').length, total: myGames.length })
      }
    }
    setLoading(false)
  }, [username, user])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>
  if (!profile) return <div className="min-h-screen bg-[#0a0a0f] text-center pt-20 text-white">User not found</div>

  const wins = games.filter(g => g.result === 'win').length
  const rate = games.length ? Math.round((wins / games.length) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-28">
      <div className="px-5 pt-14 pb-4">
        <Link to="/" className="flex items-center gap-1.5 text-white/40 text-xs font-black uppercase tracking-widest hover:text-accent transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <div className="px-5 pb-6">
        <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl mb-4 shadow-[0_0_20px_rgba(200,255,0,0.3)]">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">@{profile.username}</h1>
        <p className="text-white/60 text-sm mt-1">{profile.bio || "No bio yet."}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mb-6">
        {[
          { label: 'Wins', value: wins },
          { label: 'Win Rate', value: `${rate}%` },
          { label: 'Matches', value: games.length }
        ].map(s => (
          <div key={s.label} className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center">
            <p className="text-xl font-black text-accent italic">{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {h2h && (
        <div className="px-4 mb-6">
          <div className="bg-accent/10 p-4 rounded-3xl border border-accent/20 flex items-center gap-4">
            <Swords size={20} className="text-accent" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent/60">Your Head-to-Head</p>
              <p className="font-black text-white">{h2h.wins}W — {h2h.losses}L</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 flex gap-2 mb-4">
        {['Posts', 'Match Logs'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
            activeTab === t ? 'bg-white text-ink-900 border-white' : 'text-white/40 border-white/10'
          }`}>{t}</button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {activeTab === 'Posts' ? (
          posts.length ? posts.map(p => <PostCard key={p.id} post={p} onRefresh={load} />) : <p className="text-center py-10 text-white/20 uppercase text-xs font-black">No posts</p>
        ) : (
          games.length ? <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">{games.map(g => <MatchRow key={g.id} game={g} />)}</div> : <p className="text-center py-10 text-white/20 uppercase text-xs font-black">No matches</p>
        )}
      </div>
    </div>
  )
}