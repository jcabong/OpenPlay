import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Medal, Target, MapPin, TrendingUp } from 'lucide-react'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('players') // players, courts, locations

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  async function fetchLeaderboardData() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('games')
      .select(`
        user_id,
        result,
        court_name,
        location_name,
        users ( username, avatar_url )
      `)
      .eq('result', 'win')

    if (error) {
      console.error('Error fetching leaderboard:', error.message)
    } else if (data) {
      const playerStats = data.reduce((acc, game) => {
        const username = game.users?.username || 'Anonymous'
        if (!acc[username]) {
          acc[username] = { username, wins: 0, avatar: game.users?.avatar_url }
        }
        acc[username].wins += 1
        return acc
      }, {})

      const sortedPlayers = Object.values(playerStats).sort((a, b) => b.wins - a.wins)
      setLeaderboard(sortedPlayers)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold italic uppercase tracking-tighter text-ink-50">Standings</h1>
        <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mt-1">Season 1: OpenPlay Elite</p>
      </header>

      <div className="flex bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/5">
        {['players', 'courts', 'locations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-accent text-ink-900 shadow-lg' : 'text-ink-500 hover:text-ink-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <TrendingUp className="animate-pulse text-accent mb-4" size={32} />
          <p className="text-[10px] uppercase font-black tracking-widest">Calculating Rankings...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'players' && leaderboard.map((player, index) => (
            <div 
              key={player.username} 
              className={`
                glass rounded-3xl p-5 border flex items-center gap-4 transition-all
                ${index === 0 ? 'border-accent/40 bg-accent/5' : 'border-white/5'}
              `}
            >
              {/* Rank Badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg ${
                index === 0 ? 'bg-accent text-ink-900 glow-accent' : 
                index === 1 ? 'bg-ink-200 text-ink-900' : 
                index === 2 ? 'bg-orange-400 text-ink-900' : 'bg-ink-800 text-ink-400'
              }`}>
                {index + 1}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <p className="font-display font-bold text-base tracking-tight uppercase italic">@{player.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-black text-ink-500 uppercase tracking-widest flex items-center gap-1">
                    <Target size={10} className="text-accent"/> {player.wins} Wins
                  </span>
                </div>
              </div>

              {index === 0 && (
                <div className="bg-accent/20 text-accent text-[8px] font-black px-2 py-1 rounded-md border border-accent/20">
                  TOP RANKED
                </div>
              )}
            </div>
          ))}

          {activeTab !== 'players' && (
            <div className="text-center py-20 glass rounded-[2.5rem] border border-dashed border-white/10">
              <MapPin size={24} className="mx-auto text-ink-700 mb-4" />
              <p className="text-ink-600 font-bold uppercase text-[10px] tracking-widest italic">
                {activeTab} ranking coming soon
              </p>
              <p className="text-ink-700 text-[9px] mt-1 uppercase">Log more games to activate map stats</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}