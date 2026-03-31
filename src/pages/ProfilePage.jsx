import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GameCard from '../components/GameCard'
import { LogOut, TrendingUp, Activity, Target } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [games, setGames]   = useState([])
  const [stats, setStats]   = useState({ total: 0, wins: 0, losses: 0, draws: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserGames() {
      const { data } = await supabase
        .from('games')
        .select(`*, users(id, name, avatar_url), game_players(player_name)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const all = data || []
      setGames(all)
      setStats({
        total:  all.length,
        wins:   all.filter(g => g.result === 'win').length,
        losses: all.filter(g => g.result === 'loss').length,
        draws:  all.filter(g => g.result === 'draw').length,
      })
      setLoading(false)
    }
    fetchUserGames()
  }, [user])

  const winRate = stats.total > 0
    ? Math.round((stats.wins / stats.total) * 100)
    : 0

  const statCards = [
    { label: 'Games',    value: stats.total, Icon: Activity,  color: 'text-ink-200' },
    { label: 'Wins',     value: stats.wins,  Icon: TrendingUp, color: 'text-court-400' },
    { label: 'Losses',   value: stats.losses, Icon: Target,   color: 'text-spark' },
    { label: 'Win Rate', value: `${winRate}%`, Icon: TrendingUp, color: 'text-accent' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4">
      {/* Profile header */}
      <div className="pt-8 pb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name}
                className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <span className="font-display text-2xl font-bold text-accent">
                  {(profile?.name || user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-display text-xl font-bold text-ink-50">{profile?.name || 'Player'}</h1>
              <p className="text-ink-500 text-sm">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  🏆 {stats.wins} wins
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2.5 glass rounded-xl text-ink-500 hover:text-spark transition-colors border border-white/5"
          >
            <LogOut size={17} />
          </button>
        </div>

        {/* Win rate progress bar */}
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-widest">Win Rate</span>
            <span className="font-display font-bold text-accent text-lg">{winRate}%</span>
          </div>
          <div className="w-full h-2 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-court-400 rounded-full transition-all duration-700"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-ink-500">0%</span>
            <span className="text-[10px] text-ink-500">100%</span>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-2">
          {statCards.map(({ label, value, Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
              <span className={`font-display font-bold text-lg ${color}`}>{value}</span>
              <span className="text-[10px] text-ink-500 text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent games */}
      <div>
        <h2 className="font-display text-sm font-semibold text-ink-300 uppercase tracking-widest mb-3">
          My Games
        </h2>
        {games.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-display text-ink-400 text-base">No games logged yet</p>
            <p className="text-ink-600 text-sm mt-1">Tap Log to record your first game</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {games.map(game => (
              <GameCard key={game.id} game={game} showUser={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
