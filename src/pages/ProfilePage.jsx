import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Activity, MapPin, Target, Users } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: g } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setProfile(p); setGames(g || [])
  }

  // Logic: Only show sports that have history
  const activeSports = [...new Set(games.map(g => g.sport))]
  const totalWinRate = games.length > 0 ? ((games.filter(g => g.result === 'win').length / games.length) * 100).toFixed(0) : 0

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center font-bold text-ink-900 text-4xl glow-accent mb-4">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-3xl font-display font-bold uppercase italic tracking-tighter">@{profile?.username}</h1>
        <div className="flex items-center gap-4 mt-2">
          <div className="text-center">
            <p className="text-xl font-display font-bold text-accent">{totalWinRate}%</p>
            <p className="text-[8px] uppercase font-black text-ink-600 tracking-widest">Total Winrate</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-display font-bold">{games.length}</p>
            <p className="text-[8px] uppercase font-black text-ink-600 tracking-widest">Sessions</p>
          </div>
        </div>
      </div>

      {/* Strava Style Highlights */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-600 mb-4 px-2">Recent Highlights</h2>
        
        {games.map((game) => (
          <div key={game.id} className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
            {/* Strava Header */}
            <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ink-800 rounded-lg flex items-center justify-center font-bold text-accent text-xs">
                  {profile?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] font-bold leading-none">@{profile?.username}</p>
                  <p className="text-[8px] text-ink-600 uppercase font-black">{new Date(game.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="bg-accent/10 text-accent text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter italic">
                {game.sport}
              </span>
            </div>

            {/* Game Stats Body */}
            <div className="p-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-2xl font-display font-bold italic leading-none">{game.court_name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-ink-500">
                    <MapPin size={10} /> <span className="text-[10px] font-bold uppercase">{game.location_name || 'Local Court'}</span>
                  </div>
                </div>
                <div className={`text-2xl font-display font-bold italic ${game.result === 'win' ? 'text-accent' : 'text-spark'}`}>
                  {game.result === 'win' ? 'WIN' : 'LOSS'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4 border-t border-white/5">
                <div className="text-center">
                  <p className="text-[8px] uppercase text-ink-600 font-black mb-1">Score</p>
                  <p className="text-sm font-display font-bold">{game.score || '--'}</p>
                </div>
                <div className="text-center border-x border-white/5">
                  <p className="text-[8px] uppercase text-ink-600 font-black mb-1">Opponent</p>
                  <p className="text-sm font-display font-bold">{game.opponent_name || 'Open'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] uppercase text-ink-600 font-black mb-1">Impact</p>
                  <p className="text-sm font-display font-bold text-accent">High</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <div className="text-center py-12 glass rounded-[2.5rem] border border-dashed border-white/10">
            <Activity size={24} className="mx-auto text-ink-700 mb-2"/>
            <p className="text-[10px] font-black uppercase text-ink-600 tracking-widest italic">No activity recorded</p>
          </div>
        )}
      </div>

      <button onClick={signOut} className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest border border-spark/20">Sign Out</button>
    </div>
  )
}