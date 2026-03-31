import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Target, TrendingUp } from 'lucide-react'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [sport, setSport] = useState('tennis')

  useEffect(() => { fetchLeaderboard() }, [sport])

  async function fetchLeaderboard() {
    const { data } = await supabase.from('games').select('*, users!inner(username)').eq('result', 'win').eq('sport', sport)
    if (data) {
      const stats = data.reduce((acc, g) => {
        const name = g.users.username; acc[name] = (acc[name] || 0) + 1; return acc
      }, {})
      setLeaderboard(Object.entries(stats).sort((a,b) => b[1] - a[1]))
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-10">
      <h1 className="text-3xl font-display font-bold italic uppercase mb-6">Pro Standings</h1>
      
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {['tennis', 'pickleball', 'golf', 'tabletennis', 'badminton'].map(s => (
          <button key={s} onClick={() => setSport(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 transition-all ${sport === s ? 'bg-accent text-ink-900 border-accent glow-accent' : 'bg-white/5 border-white/10 text-ink-500'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {leaderboard.map(([name, wins], i) => (
          <div key={name} className={`glass p-5 rounded-3xl border flex items-center justify-between ${i === 0 ? 'border-accent/40 bg-accent/5' : 'border-white/5'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${i === 0 ? 'bg-accent text-ink-900' : 'bg-ink-800'}`}>{i+1}</div>
              <p className="font-display font-bold italic">@{name}</p>
            </div>
            <div className="text-right">
               <p className="text-accent font-display font-bold text-xl leading-none">{wins}</p>
               <p className="text-[8px] text-ink-600 uppercase font-black tracking-tighter">Victories</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}