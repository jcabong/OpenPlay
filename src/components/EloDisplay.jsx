/**
 * EloDisplay.jsx
 * ─────────────────────────────────────────────────────────────
 * Reusable component showing a player's ELO rating and skill tier.
 * Designed to match the existing OpenPlay dark-glass aesthetic.
 *
 * Usage:
 *   <EloDisplay elo={1234} tier="Gold" delta={+18} />
 *
 * Where to use it:
 *   - ProfilePage.jsx  (below the stats grid)
 *   - LeaderboardPage.jsx (next to player rows)
 *   - PostCard.jsx (optional — in the author header)
 */

const TIER_STYLES = {
  Diamond:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  emoji: '💎' },
  Platinum: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', emoji: '🔮' },
  Gold:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.25)',  emoji: '🥇' },
  Silver:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', emoji: '🥈' },
  Bronze:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.2)',   emoji: '🥉' },
}

/**
 * Compact inline badge — for leaderboard rows and post cards.
 */
export function EloBadge({ elo = 1000, tier = 'Bronze', size = 'sm' }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.Bronze
  const isSm  = size === 'sm'

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg border font-black"
      style={{
        background:  style.bg,
        borderColor: style.border,
        color:       style.color,
        fontSize:    isSm ? '9px'  : '11px',
        padding:     isSm ? '2px 6px' : '4px 10px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      <span>{style.emoji}</span>
      <span>{elo}</span>
      <span style={{ opacity: 0.7 }}>{tier}</span>
    </span>
  )
}

/**
 * Full ELO card — for ProfilePage stats grid.
 * Drop this in as a 4th stat card, or replace one of the existing three.
 */
export function EloCard({ elo = 1000, tier = 'Bronze', delta = null }) {
  const style     = TIER_STYLES[tier] || TIER_STYLES.Bronze
  const showDelta = delta !== null && delta !== 0
  const isGain    = delta > 0

  return (
    <div
      className="p-3.5 rounded-[1.25rem] border text-center"
      style={{
        background:  style.bg,
        borderColor: style.border,
      }}
    >
      <p
        className="font-display text-2xl font-bold italic leading-none"
        style={{ color: style.color }}
      >
        {elo}
      </p>

      {showDelta && (
        <p
          className="text-[9px] font-black mt-0.5"
          style={{ color: isGain ? '#c8ff00' : '#ff4d4d' }}
        >
          {isGain ? '+' : ''}{delta}
        </p>
      )}

      <p
        className="text-[9px] font-black uppercase tracking-widest mt-1"
        style={{ color: style.color, opacity: 0.7 }}
      >
        {style.emoji} {tier}
      </p>
    </div>
  )
}

/**
 * ELO sparkline — shows rating history as a simple SVG line.
 * Pass in the array returned from fetchEloHistory().
 *
 * @param {{ elo_after: number }[]} history - chronological ELO snapshots
 * @param {string} [color]
 */
export function EloSparkline({ history = [], color = '#c8ff00' }) {
  if (history.length < 2) return null

  const values = history.map(h => h.elo_after)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = Math.max(max - min, 1)  // avoid divide-by-zero
  const W      = 120
  const H      = 32
  const pad    = 4

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const trend      = values[values.length - 1] - values[0]
  const trendColor = trend >= 0 ? '#c8ff00' : '#ff4d4d'

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} className="shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {(() => {
          const last = points.split(' ').pop()
          const [lx, ly] = last.split(',')
          return <circle cx={lx} cy={ly} r="2.5" fill={trendColor} />
        })()}
      </svg>
      <span
        className="text-[9px] font-black"
        style={{ color: trendColor }}
      >
        {trend >= 0 ? '+' : ''}{trend}
      </span>
    </div>
  )
}

export default { EloBadge, EloCard, EloSparkline }
