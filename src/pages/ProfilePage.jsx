import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Target, MapPin, Trash2, Edit3, Check, BarChart3, Clock } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: g } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setProfile(p); setBio(p?.bio || ''); setGames(g || [])
  }

  async function updateBio() {
    await supabase.from('users').update({ bio }).eq('id', user.id)
    setIsEditingBio(false); fetchData()
  }

  // --- STATS SUMMARY LOGIC ---
  const totalMatches = games.length
  const wins = games.filter(g => g.result === 'win').length
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(0) : 0
  const topSport = games.length > 0 ? games.reduce((a,b) => (games.filter(v => v.sport === a).length >= games.filter(v => v.sport === b).length ? a : b), games[0].sport) : '-'

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl glow-accent mb-4">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{profile?.username}</h1>
        {isEditingBio ? (
          <div className="mt-2 flex gap-2"><input value={bio} onChange={e => setBio(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs" /><button onClick={updateBio} className="text-accent"><Check size={18}/></button></div>
        ) : (
          <p className="text-ink-500 text-sm mt-1 italic flex items-center gap-2" onClick={() => setIsEditingBio(true)}>{profile?.bio || 'Add a bio...'} <Edit3 size={12}/></p>
        )}
      </div>

      {/* --- NEW SUMMARY CARD --- */}
      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-10 grid grid-cols-2 gap-6 bg-gradient-to-br from-white/5 to-transparent">
        <div className="col-span-2 border-b border-white/5 pb-4 mb-2 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-ink-600 tracking-[0.2em]">Career Summary</span>
          <Trophy size={14} className="text-accent" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
          <p className="text-[8px] uppercase font-black text-ink-600 mt-1">Win Rate</p>
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-ink-50">{totalMatches}</p>
          <p className="text-[8px] uppercase font-black text-ink-600 mt-1">Matches</p>
        </div>
        <div>
          <p className="text-xs font-display font-bold uppercase text-ink-50">{topSport}</p>
          <p className="text-[8px] uppercase font-black text-ink-600 mt-1">Primary Sport</p>
        </div>
        <div>
          <p className="text-xs font-display font-bold text-ink-50 italic">PRO</p>
          <p className="text-[8px] uppercase font-black text-ink-600 mt-1">Status</p>
        </div>
      </div>

      {/* Recent Highlights (The "Feed" view inside profile) */}
      <h2 className="text-[10px] font-black uppercase text-ink-600 tracking-widest mb-4 ml-2 flex items-center gap-2">
        <Clock size={12} /> Recent Activities
      </h2>
      <div className="space-y-4">
        {games.map(game => (
          <div key={game.id} className="glass p-5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-4 py-1 bg-white/5 text-accent text-[8px] font-black uppercase italic rounded-bl-xl group-hover:bg-accent group-hover:text-ink-900 transition-colors">
              {game.sport}
            </div>
            <p className="text-ink-700 text-[8px] font-black uppercase mb-1">{new Date(game.created_at).toLocaleDateString()}</p>
            <h3 className="text-lg font-display font-bold italic text-ink-100">{game.court_name}</h3>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <div className="flex flex-col"><span className={`text-xs font-black italic ${game.result === 'win' ? 'text-accent' : 'text-spark'}`}>{game.result.toUpperCase()}</span></div>
                <div className="flex flex-col"><span className="text-xs font-bold text-ink-300">{game.score || '-'}</span></div>
              </div>
              <div className="flex items-center gap-1 text-ink-600"><Users size={10}/><span className="text-[10px] font-bold">{game.opponent_name || 'Open'}</span></div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={signOut} className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest border border-spark/20">Sign Out</button>
    </div>
  )
}