import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GameCard from '../components/GameCard'
import { RefreshCw } from 'lucide-react'

export default function FeedPage() {
  const { profile } = useAuth()
  const [games, setGames]     = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchGames() {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        users ( id, name, avatar_url ),
        game_players ( player_name )
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error) setGames(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchGames()

    // Realtime subscription
    const channel = supabase
      .channel('games-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games' }, fetchGames)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    fetchGames()
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <div className="flex items-center justify-between pt-6 pb-4">
        <div>
          <p className="text-ink-400 text-sm">{greeting()},</p>
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {profile?.name?.split(' ')[0] || 'Player'} 👋
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          className={`p-2.5 glass rounded-xl text-ink-400 hover:text-ink-100 transition-all ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Activity strip */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {[
          { label: 'All Sports', active: true },
          { label: '🏸 Badminton', active: false },
          { label: '🥒 Pickleball', active: false },
        ].map(f => (
          <button
            key={f.label}
            className={`flex-none text-xs font-medium px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              f.active
                ? 'bg-accent text-ink-900 font-semibold'
                : 'glass text-ink-400 hover:text-ink-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-semibold text-ink-300 uppercase tracking-widest">
          Recent Games
        </h2>
        <span className="text-xs text-ink-500">{games.length} games</span>
      </div>

      {/* Game cards */}
      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🏸</span>
          <p className="font-display text-ink-300 text-lg font-semibold mb-1">No games yet</p>
          <p className="text-ink-500 text-sm">Be the first to log a game!</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {games.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}
