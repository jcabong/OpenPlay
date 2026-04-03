import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag } from 'lucide-react'

const TIERS = [
  { id: 'court',    label: 'Court',    icon: Building2 },
  { id: 'city',     label: 'City',     icon: MapPin    },
  { id: 'national', label: 'National', icon: Flag      },
  { id: 'global',   label: 'Global',   icon: Globe     },
]

function calcScore(wins, total) {
  if (total === 0) return 0
  const winRate = wins / total
  // Score = wins * 0.6 + win_rate * 0.4 (weighted combo)
  return wins * 0.6 + winRate * 100 * 0.4
}

function Avatar({ name, size = 'md', accent = false }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  const sz = size === 'lg' ? 'w-14 h-14 text-xl rounded-[1.25rem]'
           : size === 'sm' ? 'w-9 h-9 text-sm rounded-xl'
           : 'w-12 h-12 text-lg rounded-[1rem]'
  return (
    <div className={`${sz} flex items-center justify-center font-bold shrink-0 ${
      accent ? 'bg-accent text-ink-900' : 'bg-ink-700 text-ink-300'
    }`}>
      {initial}
    </div>
  )
}

function StatBadge({ wins, total, winRate }) {
  return (
    <div className="text-right">
      <p className="font-display font-bold text-lg text-accent italic leading-none">{wins}W</p>
      <p className="text-[9px] font-black text-ink-500 uppercase tracking-widest mt-0.5">{winRate}% WR</p>
      <p className="text-[9px] text-ink-700 mt-0.5">{total} games</p>
    </div>
  )
}

function Podium({ board }) {
  if (board.length < 1) return null
  const first  = board[0]
  const second = board[1]
  const third  = board[2]

  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {/* 2nd */}
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar name={second.username} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{second.username}</p>
            <p className="font-display font-bold text-lg text-ink-300 leading-none">{second.wins}W</p>
            <p className="text-[9px] text-ink-600">{second.winRate}%</p>
          </div>
          <div className="w-full h-14 bg-ink-700 rounded-t-xl flex items-center justify-center">
            <span className="font-display font-bold text-ink-400 text-2xl">2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      {/* 1st */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar name={first.username} size="lg" accent />
        <div className="text-center">
          <p className="text-[9px] font-black text-accent truncate max-w-[80px]">@{first.username}</p>
          <p className="font-display font-bold text-2xl text-accent leading-none">{first.wins}W</p>
          <p className="text-[9px] text-accent/60">{first.winRate}%</p>
        </div>
        <div className="w-full h-20 bg-accent/20 border border-accent/30 rounded-t-xl flex items-center justify-center">
          <span className="font-display font-bold text-accent text-2xl">1</span>
        </div>
      </div>

      {/* 3rd */}
      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar name={third.username} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{third.username}</p>
            <p className="font-display font-bold text-lg text-orange-400 leading-none">{third.wins}W</p>
            <p className="text-[9px] text-ink-600">{third.winRate}%</p>
          </div>
          <div className="w-full h-10 bg-orange-900/30 border border-orange-600/20 rounded-t-xl flex items-center justify-center">
            <span className="font-display font-bold text-orange-500 text-xl">3</span>
          </div>
        </div>
      ) : <div className="flex-1" />}
    </div>
  )
}

export default function LeaderboardPage() {
  const [sport, setSport]   = useState('badminton')
  const [tier, setTier]     = useState('national')
  const [board, setBoard]   = useState([])
  const [loading, setLoading] = useState(true)
  const [courtOptions, setCourtOptions] = useState([])
  const [selectedCourt, setSelectedCourt] = useState('')

  // Fetch available courts from logged games for Court tier
  const fetchCourts = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name')
      .eq('sport', sport)
      .not('court_name', 'is', null)
      .neq('court_name', '')
    if (data) {
      const unique = [...new Set(data.map(g => g.court_name))].sort()
      setCourtOptions(unique)
      if (unique.length > 0 && !unique.includes(selectedCourt)) {
        setSelectedCourt(unique[0])
      }
    }
  }, [sport])

  const fetchBoard = useCallback(async () => {
    if (tier === 'court' && !selectedCourt) { setBoard([]); setLoading(false); return }
    setLoading(true)
    try {
      let q = supabase
        .from('games')
        .select('user_id, result, city, court_name, users!inner(id, username, city)')
        .eq('sport', sport)

      if (tier === 'court') q = q.eq('court_name', selectedCourt)

      const { data, error } = await q
      if (error) { console.error('fetchBoard error:', error); setLoading(false); return }
      if (!data || data.length === 0) { setBoard([]); setLoading(false); return }

      // Tally wins, losses per player
      const tally = data.reduce((acc, g) => {
        const id  = g.user_id
        const usr = g.users
        if (!acc[id]) acc[id] = {
          username: usr.username,
          city:     usr.city || g.city || '—',
          wins:     0,
          total:    0,
        }
        acc[id].total++
        if (g.result === 'win') acc[id].wins++
        return acc
      }, {})

      const sorted = Object.values(tally)
        .map(p => ({
          ...p,
          winRate: p.total > 0 ? Math.round(p.wins / p.total * 100) : 0,
          score:   calcScore(p.wins, p.total),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)

      setBoard(sorted)
    } finally {
      setLoading(false)
    }
  }, [sport, tier, selectedCourt])

  useEffect(() => { fetchCourts() }, [fetchCourts])
  useEffect(() => { fetchBoard() },  [fetchBoard])

  const sportEmoji = SPORTS.find(s => s.id === sport)?.emoji || '🏸'
  const TierIcon   = TIERS.find(t => t.id === tier)?.icon || Trophy

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={20} className="text-accent" />
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Rankings</h1>
        </div>
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">Court · City · National · Global</p>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${
              sport === s.id
                ? 'bg-accent text-ink-900 border-accent glow-accent scale-105'
                : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Tier tabs */}
      <div className="px-5 mb-4">
        <div className="glass flex rounded-2xl overflow-hidden border border-white/10">
          {TIERS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${
                  tier === t.id ? 'bg-accent text-ink-900' : 'text-ink-500 hover:text-ink-300'
                }`}
              >
                <Icon size={12} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Court selector */}
      {tier === 'court' && (
        <div className="px-5 mb-4">
          {courtOptions.length === 0 ? (
            <p className="text-ink-600 text-xs font-bold text-center py-2">
              No courts found for {sportEmoji} yet — log a match at a court first!
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {courtOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCourt(c)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
                    selectedCourt === c
                      ? 'bg-accent text-ink-900 border-accent'
                      : 'bg-white/5 border-white/10 text-ink-500'
                  }`}
                >
                  🏟️ {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tier label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} className="text-accent" />
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">
          {tier === 'court'    && selectedCourt ? `${selectedCourt}` : ''}
          {tier === 'city'     ? 'City Rankings' : ''}
          {tier === 'national' ? 'Philippines Rankings' : ''}
          {tier === 'global'   ? 'Global Rankings' : ''}
        </p>
      </div>

      {/* Scoring legend */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/3 border border-white/5">
          <p className="text-[9px] text-ink-600 font-bold">Score = Wins × 0.6 + Win Rate × 0.4</p>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">{sportEmoji}</p>
          <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No data yet</p>
          <p className="text-ink-700 text-xs mt-1">Be the first to log a match!</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />

          {/* Rest of board */}
          {board.length > 3 && (
            <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
              {board.slice(3).map((player, i) => (
                <div key={player.username} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
                  <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                    {i + 4}
                  </div>
                  <Avatar name={player.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-ink-100 truncate">@{player.username}</p>
                    <p className="text-[10px] text-ink-600 font-bold flex items-center gap-1">
                      <MapPin size={8} /> {player.city}
                    </p>
                  </div>
                  <StatBadge wins={player.wins} total={player.total} winRate={player.winRate} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
