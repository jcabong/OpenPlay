import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Target, Calendar, Ballpark } from 'lucide-react'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [timeframe, setTimeframe] = useState('all') // all, weekly, monthly
  const [sport, setSport] = useState('basketball') // basketball, volleyball, etc.

  useEffect(() => { fetchLeaderboard() }, [timeframe, sport])

  async function fetchLeaderboard() {
    let query = supabase.from('games').select('*, users!inner(username)').eq('result', 'win').eq('sport', sport)
    
    const now = new Date()
    if (timeframe === 'weekly') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString()
      query = query.gte('created_at', weekAgo)
    } else if (timeframe === 'monthly') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
      query = query.gte('created_at', monthAgo)
    }

    const { data } = await query
    if (data) {
      const stats = data.reduce((acc, g) => {
        const name = g.users.username; acc[name] = (acc[name] || 0) + 1; return acc
      }, {})
      setLeaderboard(Object.entries(stats).sort((a,b) => b[1] - a[1]))
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-10">
      <h1 className="text-4xl font-display font-bold italic uppercase mb-6">Standings</h1>
      
      {/* Sport Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {['basketball', 'volleyball', 'pickleball', 'football'].map(s => (
          <button key={s} onClick={() => setSport(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sport === s ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Timeframe Selector */}
      <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
        {['all', 'weekly', 'monthly'].map(t => (
          <button key={t} onClick={() => setTimeframe(t)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${timeframe === t ? 'bg-ink-800 text-accent shadow-lg' : 'text-ink-600'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {leaderboard.map(([name, wins], i) => (
          <div key={name} className={`glass p-5 rounded-3xl border flex items-center gap-4 ${i === 0 ? 'border-accent/40 bg-accent/5' : 'border-white/5'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${i === 0 ? 'bg-accent text-ink-900' : 'bg-ink-800'}`}>{i+1}</div>
            <div className="flex-1"><p className="font-display font-bold uppercase italic">@{name}</p></div>
            <div className="text-right"><p className="text-accent font-display font-bold text-xl">{wins}</p><p className="text-[8px] text-ink-600 uppercase font-black">Wins</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}