import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Settings, Edit2, Check } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [bio, setBio] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedSport, setSelectedSport] = useState('basketball')

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: g } = await supabase.from('games').select('*').eq('user_id', user.id)
    setProfile(p); setBio(p?.bio || ''); setGames(g || [])
  }

  async function saveBio() {
    await supabase.from('users').update({ bio }).eq('id', user.id)
    setIsEditing(false); fetchData()
  }

  const sportGames = games.filter(g => g.sport === selectedSport)
  const winRate = sportGames.length > 0 ? ((sportGames.filter(g => g.result === 'win').length / sportGames.length) * 100).toFixed(0) : 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      <div className="flex justify-between items-start mb-8">
        <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center font-bold text-ink-900 text-4xl glow-accent">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <button onClick={signOut} className="p-3 glass rounded-2xl text-spark border-spark/20"><Settings size={20}/></button>
      </div>

      <h1 className="text-3xl font-display font-bold uppercase italic">@{profile?.username}</h1>
      
      {/* Bio Section */}
      <div className="mt-2 mb-8">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-ink-100" rows="2" />
            <button onClick={saveBio} className="bg-accent/20 text-accent font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-xs"><Check size={14}/> SAVE BIO</button>
          </div>
        ) : (
          <div className="flex items-start gap-2 group" onClick={() => setIsEditing(true)}>
            <p className="text-ink-400 text-sm leading-relaxed italic">{profile?.bio || 'Click to add a bio...'}</p>
            <Edit2 size={12} className="text-ink-600 mt-1 opacity-0 group-hover:opacity-100" />
          </div>
        )}
      </div>

      {/* Sport Stats Selector */}
      <div className="flex gap-2 mb-6">
        {['basketball', 'volleyball', 'pickleball'].map(s => (
          <button key={s} onClick={() => setSelectedSport(s)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSport === s ? 'bg-accent text-ink-900' : 'bg-white/5 text-ink-600'}`}>{s}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl border border-white/5">
          <p className="text-accent font-display font-bold text-2xl">{winRate}%</p>
          <p className="text-[8px] uppercase font-black text-ink-500 tracking-widest mt-1">Win Rate</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-white/5">
          <p className="text-ink-50 font-display font-bold text-2xl">{sportGames.length}</p>
          <p className="text-[8px] uppercase font-black text-ink-500 tracking-widest mt-1">Matches</p>
        </div>
      </div>
    </div>
  )
}