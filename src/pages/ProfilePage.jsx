import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Trash2, Edit3, Check, Clock, Users } from 'lucide-react'

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

  async function deleteGame(id) {
    if (window.confirm("Delete this match?")) {
      await supabase.from('games').delete().eq('id', id).eq('user_id', user.id)
      fetchData()
    }
  }

  const totalMatches = games.length
  const winRate = totalMatches > 0 ? ((games.filter(g => g.result === 'win').length / totalMatches) * 100).toFixed(0) : 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl glow-accent mb-4">
          {(profile?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight">@{profile?.username}</h1>
        {isEditingBio ? (
          <div className="mt-2 flex gap-2"><input value={bio} onChange={e => setBio(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs text-white" /><button onClick={updateBio} className="text-accent"><Check size={18}/></button></div>
        ) : (
          <p className="text-ink-500 text-sm mt-1 italic flex items-center gap-2" onClick={() => setIsEditingBio(true)}>{profile?.bio || 'Add a bio...'} <Edit3 size={12}/></p>
        )}
      </div>

      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-10 grid grid-cols-2 gap-6 bg-gradient-to-br from-white/5 to-transparent">
        <div className="col-span-2 border-b border-white/5 pb-2 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-ink-600 tracking-widest">Career Summary</span><Trophy size={14} className="text-accent" /></div>
        <div><p className="text-2xl font-display font-bold text-accent">{winRate}%</p><p className="text-[8px] uppercase font-black text-ink-600 tracking-widest">Win Rate</p></div>
        <div><p className="text-2xl font-display font-bold text-white">{totalMatches}</p><p className="text-[8px] uppercase font-black text-ink-600 tracking-widest">Total Matches</p></div>
      </div>

      <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-2 flex items-center gap-2 tracking-[0.2em]"><Clock size={12} /> Highlights</h2>
      <div className="space-y-4">
        {games.map(game => (
          <div key={game.id} className="glass p-5 rounded-[2rem] border border-white/5 relative group bg-gradient-to-br from-white/[0.01] to-transparent">
            <button onClick={() => deleteGame(game.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-spark hover:scale-110 transition-all"><Trash2 size={14}/></button>
            <div className="text-accent text-[8px] font-black uppercase italic mb-1 tracking-widest">{game.sport}</div>
            <h3 className="text-lg font-display font-bold italic tracking-tight text-white">{game.court_name}</h3>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <span className={`text-xs font-black italic uppercase ${game.result === 'win' ? 'text-accent' : 'text-spark'}`}>{game.result}</span>
                <span className="text-xs font-bold text-ink-300 font-display italic">{game.score || '-'}</span>
              </div>
              <div className="flex items-center gap-1 text-ink-600"><Users size={10}/><span className="text-[10px] font-bold">vs {game.opponent_name || 'Open'}</span></div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={signOut} className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest border border-spark/10">Sign Out</button>
    </div>
  )
}