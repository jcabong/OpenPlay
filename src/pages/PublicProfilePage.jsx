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
  // 1. Clean the username (remove @ if it exists in the URL)
  let { username } = useParams()
  const cleanUsername = username?.replace('@', '')
  
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [h2h, setH2h] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Posts')

  const load = useCallback(async () => {
    if (!cleanUsername) return
    setLoading(true)
    
    // 2. Use .ilike for case-insensitive lookup (matches jcva, JCVA, Jcva)
    const { data: usr, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUsername)
      .maybeSingle()

    if (error || !usr) {
      console.error("Profile fetch error:", error)
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(usr)

    // 3. Fetch matches and posts for this user
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from('games')
        .select('*')
        .eq('user_id', usr.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('posts')
        .select('*, author:profiles(id,username), likes(user_id), comments(*, profiles(username))')
        .eq('author_id', usr.id)
        .eq('is_deleted', false)
        .order('inserted_at', { ascending: false })
    ])
    
    setGames(g || [])
    setPosts(p || [])

    // 4. Calculate Head-to-Head if viewing someone else
    if (user && user.id !== usr.id) {
      const { data: myGames } = await supabase
        .from('games')
        .select('result')
        .eq('user_id', user.id)
        .eq('tagged_opponent_id', usr.id)
        .eq('is_deleted', false)
      
      if (myGames?.length) {
        setH2h({ 
          wins: myGames.filter(x => x.result === 'win').length, 
          losses: myGames.filter(x => x.result === 'loss').length, 
          total: myGames.length 
        })
      }
    }
    setLoading(false)
  }, [cleanUsername, user])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="animate-spin text-accent" />
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-[#0a0a0f] text-center pt-32 px-10">
      <div className="text-6xl mb-6">🔍</div>
      <h2 className="text-xl font-black uppercase text-white italic">User Not Found</h2>
      <p className="text-white/40 text-sm mt-2 mb-8">The player @{cleanUsername} hasn't joined OpenPlay yet.</p>
      <Link to="/" className="text-accent font-black uppercase text-xs tracking-widest border-b border-accent pb-1">
        Back to Feed
      </Link>
    </div>
  )

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
          {(profile.username || 'P').charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">@{profile.username}</h1>
        <p className="text-white/60 text-sm mt-1 leading-relaxed">{profile.bio || "This player is ready for a match."}</p>
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
            <div className="ml-auto text-[10px] font-bold text-white/30 uppercase">
              {h2h.total} Played
            </div>
          </div>
        </div>
      )}

      <div className="px-4 flex gap-2 mb-4">
        {['Posts', 'Match Logs'].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              activeTab === t ? 'bg-white text-ink-900 border-white' : 'text-white/40 border-white/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {activeTab === 'Posts' ? (
          posts.length ? posts.map(p => <PostCard key={p.id} post={p} onRefresh={load} />) : <p className="text-center py-14 text-white/20 uppercase text-[10px] font-black tracking-widest">No posts yet</p>
        ) : (
          games.length ? (
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
              {games.map(g => <MatchRow key={g.id} game={g} />)}
            </div>
          ) : (
            <p className="text-center py-14 text-white/20 uppercase text-[10px] font-black tracking-widest">No matches recorded</p>
          )
        )}
      </div>
    </div>
  )
}