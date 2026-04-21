import { MapPin, Clock, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const SPORT_CONFIG = {
  badminton:  { emoji: '🏸', label: 'Badminton',  badgeClass: 'badge-badminton' },
  pickleball: { emoji: '🥒', label: 'Pickleball', badgeClass: 'badge-pickleball' },
}

const RESULT_CONFIG = {
  win:  { label: 'W', cls: 'bg-court-500/20 text-court-400 border border-court-500/30' },
  loss: { label: 'L', cls: 'bg-spark/20 text-spark border border-spark/30' },
  draw: { label: 'D', cls: 'bg-ink-500/40 text-ink-200 border border-white/10' },
}

export default function GameCard({ game, showUser = true }) {
  const sport  = SPORT_CONFIG[game.sport]  || SPORT_CONFIG.badminton
  const result = RESULT_CONFIG[game.result] || RESULT_CONFIG.draw
  const opponents = game.game_players?.map(p => p.player_name).join(', ')

  return (
    <article className="glass rounded-2xl p-4 animate-slide-up hover:border-white/12 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {showUser && game.users?.avatar_url ? (
            <img
              src={game.users.avatar_url}
              alt={game.users.name}
              className="w-9 h-9 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-ink-600 flex items-center justify-center text-sm font-display font-semibold text-ink-200">
              {(game.users?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-50 leading-none mb-0.5">
              {game.users?.name || 'Player'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sport.badgeClass}`}>
                {sport.emoji} {sport.label}
              </span>
            </div>
          </div>
        </div>

        {/* Result badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-display font-bold ${result.cls}`}>
          {result.label}
        </div>
      </div>

      {/* Score */}
      <div className="mb-3">
        <p className="font-display text-2xl font-bold text-ink-50 tracking-tight">
          {game.score}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-ink-400 text-xs">
        {game.location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {game.location}
          </span>
        )}
        {opponents && (
          <span className="flex items-center gap-1">
            <Users size={11} />
            vs {opponents}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={11} />
          {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
        </span>
      </div>
    </article>
  )
}
