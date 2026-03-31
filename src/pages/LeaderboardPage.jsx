import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, TrendingUp } from 'lucide-react'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      // Get all wins grouped by user
      const { data, error } = await supabase
        .from('games')
        .select('user_id, result, users(id, name, avatar_url)')
        .eq('result', 'win')

      if (error) { setLoading(false); return }

      // Aggregate wins per user
      const map = {}
      for (const row of data || []) {
        const uid = row.user_id
        if (!map[uid]) {
          map[uid] = { ...row.users, wins: 0 }
        }
        map[uid].wins++
      }

      // Also get total games for win rate
      const { data: allGames } = await supabase
        .from('games')
        .select('user_id')

      const totals = {}
      for (const g of allGames || []) {
        totals[g.user_id] = (totals[g.user_id] || 0) + 1
      }

      const ranked = Object.values(map)
        .map(u => ({ ...u, total: totals[u.id] || 0, winRate: Math.round((u.wins / (totals[u.id] || 1)) * 100) }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10)

      setLeaders(ranked)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4">
      {/* Header */}
      <div className="pt-6 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={20} className="text-accent" />
          <h1 className="font-display text-2xl font-bold text-ink-50">Leaderboard</h1>
        </div>
        <p className="text-ink-400 text-sm">Top 10 players by total wins</p>
      </div>

      {/* Podium (top 3) */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-2 mb-8">
          {[leaders[1], leaders[0], leaders[2]].map((player, i) => {
            const isCenter = i === 1
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3
            const heights = ['h-24', 'h-32', 'h-20']
            return (
              <div key={player.id} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-2xl">{MEDALS[rank - 1]}</span>
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.name}
                    className={`rounded-full object-cover border-2 ${isCenter ? 'w-14 h-14 border-accent' : 'w-11 h-11 border-white/20'}`} />
                ) : (
                  <div className={`rounded-full flex items-center justify-center font-display font-bold border-2 ${
                    isCenter ? 'w-14 h-14 border-accent bg-accent/10 text-accent text-xl' : 'w-11 h-11 border-white/10 bg-ink-600 text-ink-200 text-base'
                  }`}>
                    {player.name[0].toUpperCase()}
                  </div>
                )}
                <p className={`font-semibold text-center truncate w-full text-center ${isCenter ? 'text-ink-50 text-sm' : 'text-ink-300 text-xs'}`}>
                  {player.name.split(' ')[0]}
                </p>
                <div className={`w-full rounded-t-xl flex items-end justify-center pb-2 ${heights[i]} ${
                  isCenter ? 'bg-gradient-to-b from-accent/20 to-accent/5 border border-accent/20' : 'bg-ink-700/40 border border-white/5'
                }`}>
                  <span className={`font-display font-bold ${isCenter ? 'text-accent text-lg' : 'text-ink-300 text-sm'}`}>
                    {player.wins}W
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      <div className="space-y-2">
        {leaders.slice(3).map((player, i) => (
          <div key={player.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up">
            <span className="font-display font-bold text-ink-400 w-6 text-center text-sm">#{i + 4}</span>
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-ink-600 flex items-center justify-center font-display font-semibold text-ink-200">
                {player.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink-50 text-sm truncate">{player.name}</p>
              <p className="text-ink-500 text-xs">{player.total} games played</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-ink-50 text-sm">{player.wins}</p>
              <p className="text-ink-500 text-xs">{player.winRate}% WR</p>
            </div>
          </div>
        ))}
      </div>

      {leaders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy size={40} className="text-ink-600 mb-4" />
          <p className="font-display text-ink-300 text-lg font-semibold">No rankings yet</p>
          <p className="text-ink-500 text-sm mt-1">Log some games to appear here!</p>
        </div>
      )}
    </div>
  )
}
