import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag, Map, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { LeaderboardSkeleton } from '../components/SkeletonCard'
import { Link } from 'react-router-dom'

const TIERS = [
  { id: 'court',    label: 'Court',    icon: Building2 },
  { id: 'city',     label: 'City',     icon: MapPin    },
  { id: 'province', label: 'Province', icon: Map       },
  { id: 'national', label: 'National', icon: Flag      },
  { id: 'global',   label: 'Global',   icon: Globe     },
]

// Skill tier based on ELO
function getSkillTier(elo) {
  if (elo >= 1600) return { label: 'Legend',    color: '#ff9f00', bg: 'rgba(255,159,0,0.12)',   emoji: '🏆' }
  if (elo >= 1400) return { label: 'Diamond',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '💎' }
  if (elo >= 1250) return { label: 'Platinum',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', emoji: '✨' }
  if (elo >= 1100) return { label: 'Gold',      color: '#c8ff00', bg: 'rgba(200,255,0,0.12)',   emoji: '⭐' }
  if (elo >= 950)  return { label: 'Silver',    color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', emoji: '🥈' }
  return                  { label: 'Bronze',    color: '#d97706', bg: 'rgba(217,119,6,0.12)',   emoji: '🥉' }
}

function Avatar({ user, size = 'md', accent = false, ring = null }) {
  const username  = user?.username || '?'
  const initial   = username.charAt(0).toUpperCase()
  const hasAvatar = user?.avatar_url && user?.avatar_type !== 'initials'

  const sz = size === 'lg' ? 'w-14 h-14 text-xl rounded-[1.25rem]'
           : size === 'sm' ? 'w-9 h-9 text-sm rounded-xl'
           : 'w-12 h-12 text-lg rounded-[1rem]'

  const ringStyle = ring
    ? { boxShadow: `0 0 0 2px ${ring}, 0 0 16px ${ring}40` }
    : {}

  if (hasAvatar) {
    return (
      <div className={`${sz} shrink-0 overflow-hidden`} style={ringStyle}>
        <img src={user.avatar_url} alt={username} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`${sz} flex items-center justify-center font-bold shrink-0 ${
        accent ? 'bg-accent text-ink-900' : 'bg-ink-700 text-ink-300'
      }`}
      style={ringStyle}
    >
      {initial}
    </div>
  )
}

function ELOBadge({ elo }) {
  const tier = getSkillTier(elo)
  return (
    <span
      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
      style={{ color: tier.color, background: tier.bg }}
    >
      {tier.emoji} {tier.label}
    </span>
  )
}

function Podium({ board }) {
  if (board.length < 1) return null
  const first  = board[0]
  const second = board[1]
  const third  = board[2]

  const medals = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {/* Second */}
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Link to={`/user/${second.username}`} className="flex flex-col items-center gap-1.5 group">
            <Avatar user={second} size="md" ring={medals[1]} />
            <div className="text-center">
              <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px] group-hover:text-accent transition-colors">
                @{second.username}
              </p>
              <p className="font-display font-bold text-xl text-ink-200 leading-none">
                {second.elo}
              </p>
              <p className="text-[9px] text-ink-600">{second.wins}W · {second.winRate}%</p>
              <ELOBadge elo={second.elo} />
            </div>
          </Link>
          <div className="w-full h-14 bg-ink-700/60 rounded-t-xl flex items-center justify-center border border-white/5">
            <span className="font-display font-bold text-ink-400 text-2xl">2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      {/* First */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Link to={`/user/${first.username}`} className="flex flex-col items-center gap-1.5 group">
          <Avatar user={first} size="lg" ring={medals[0]} />
          <div className="text-center">
            <p className="text-[9px] font-black text-accent truncate max-w-[80px] group-hover:underline">
              @{first.username}
            </p>
            <p className="font-display font-bold text-2xl text-accent leading-none">
              {first.elo}
            </p>
            <p className="text-[9px] text-accent/60">{first.wins}W · {first.winRate}%</p>
            <ELOBadge elo={first.elo} />
          </div>
        </Link>
        <div className="w-full h-20 rounded-t-xl flex items-center justify-center border border-accent/20"
          style={{ background: 'rgba(200,255,0,0.08)' }}>
          <span className="font-display font-bold text-accent text-2xl">1</span>
        </div>
      </div>

      {/* Third */}
      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Link to={`/user/${third.username}`} className="flex flex-col items-center gap-1.5 group">
            <Avatar user={third} size="md" ring={medals[2]} />
            <div className="text-center">
              <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px] group-hover:text-accent transition-colors">
                @{third.username}
              </p>
              <p className="font-display font-bold text-xl text-orange-400 leading-none">
                {third.elo}
              </p>
              <p className="text-[9px] text-ink-600">{third.wins}W · {third.winRate}%</p>
              <ELOBadge elo={third.elo} />
            </div>
          </Link>
          <div className="w-full h-10 rounded-t-xl flex items-center justify-center border border-orange-600/20"
            style={{ background: 'rgba(217,119,6,0.08)' }}>
            <span className="font-display font-bold text-orange-500 text-xl">3</span>
          </div>
        </div>
      ) : <div className="flex-1" />}
    </div>
  )
}

function ScopeSelector({ options, selected, onSelect, emoji }) {
  if (options.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-5 mb-4">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
            selected === o
              ? 'bg-accent text-ink-900 border-accent'
              : 'bg-white/5 border-white/10 text-ink-500'
          }`}
        >
          {emoji} {o}
        </button>
      ))}
    </div>
  )
}

// ── Empty state per tier ─────────────────────────────────────────────────────
function EmptyLeaderboard({ tier, sport }) {
  const sportObj = SPORTS.find(s => s.id === sport)
  const hints = {
    court:    'Log a match at a specific court to appear here.',
    city:     'Log a match with your city location set.',
    province: 'Log a match with province location to appear here.',
    national: 'Tag an opponent when logging a WIN — that\'s how rankings are built.',
    global:   'Tag an opponent when logging a WIN — that\'s how rankings are built.',
  }

  return (
    <div className="text-center py-16 px-6">
      <p className="text-5xl mb-4">{sportObj?.emoji || '🏸'}</p>
      <p className="font-black uppercase text-xs tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        No rankings yet
      </p>
      <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {hints[tier]}
      </p>
      <div className="mt-6 px-4 py-3 rounded-2xl border border-accent/20 mx-auto max-w-xs"
        style={{ background: 'rgba(200,255,0,0.04)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">
          How ELO works
        </p>
        <p className="text-[10px] text-ink-500 leading-relaxed">
          Win vs higher-ranked players = more ELO gained. Every tagged match counts. Start at 1000.
        </p>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [sport, setSport]                     = useState('badminton')
  const [tier, setTier]                       = useState('national')
  const [board, setBoard]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [courtOptions, setCourtOptions]       = useState([])
  const [selectedCourt, setSelectedCourt]     = useState('')
  const [cityOptions, setCityOptions]         = useState([])
  const [selectedCity, setSelectedCity]       = useState('')
  const [provinceOptions, setProvinceOptions] = useState([])
  const [selectedProvince, setSelectedProvince] = useState('')

  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name, city, province, user:users!user_id(city, username, avatar_url, avatar_type)')
      .eq('sport', sport)
      .eq('is_deleted', false)

    if (!data) return

    const courts    = [...new Set(data.map(g => g.court_name).filter(Boolean))].sort()
    const cities    = [...new Set(data.map(g => g.city || g.user?.city || '').filter(Boolean))].sort()
    const provinces = [...new Set(data.map(g => g.province).filter(Boolean))].sort()

    setCourtOptions(courts)
    setCityOptions(cities)
    setProvinceOptions(provinces)

    setSelectedCourt(prev    => courts.includes(prev)    ? prev : (courts[0]    || ''))
    setSelectedCity(prev     => cities.includes(prev)    ? prev : (cities[0]    || ''))
    setSelectedProvince(prev => provinces.includes(prev) ? prev : (provinces[0] || ''))
  }, [sport])

  const fetchBoard = useCallback(async () => {
    if (tier === 'court'    && !selectedCourt)    { setBoard([]); setLoading(false); return }
    if (tier === 'city'     && !selectedCity)     { setBoard([]); setLoading(false); return }
    if (tier === 'province' && !selectedProvince) { setBoard([]); setLoading(false); return }

    setLoading(true)
    try {
      // ── ELO column name ──────────────────────────────────────────────
      const eloCol = `elo_${sport}`

      // Fetch users with their ELO + game stats for this sport
      const { data: gamesData, error } = await supabase
        .from('games')
        .select(`
          user_id, result, city, province, court_name,
          user:users!user_id(id, username, display_name, city, avatar_url, avatar_type, ${eloCol})
        `)
        .eq('sport', sport)
        .eq('is_deleted', false)
        .not('tagged_opponent_id', 'is', null)

      if (error) { console.error(error); setBoard([]); setLoading(false); return }
      if (!gamesData?.length) { setBoard([]); setLoading(false); return }

      // Filter by tier scope
      let rows = gamesData
      if (tier === 'court')    rows = gamesData.filter(g => g.court_name === selectedCourt)
      if (tier === 'city')     rows = gamesData.filter(g => (g.city || g.user?.city || '') === selectedCity)
      if (tier === 'province') rows = gamesData.filter(g => g.province === selectedProvince)

      if (!rows.length) { setBoard([]); setLoading(false); return }

      // Tally wins per player
      const tally = rows.reduce((acc, g) => {
        const id  = g.user_id
        const usr = g.user
        if (!usr) return acc
        if (!acc[id]) {
          acc[id] = {
            id:          id,
            username:    usr.username || '—',
            display_name: usr.display_name || usr.username || '—',
            avatar_url:  usr.avatar_url,
            avatar_type: usr.avatar_type,
            city:        g.city || usr.city || '—',
            province:    g.province || '—',
            wins:        0,
            total:       0,
            // Pull ELO from user record (updated by trigger)
            elo:         usr[eloCol] || 1000,
          }
        }
        acc[id].total++
        if (g.result === 'win') acc[id].wins++
        if (g.city)     acc[id].city     = g.city
        if (g.province) acc[id].province = g.province
        return acc
      }, {})

      const sorted = Object.values(tally)
        .map(p => ({
          ...p,
          winRate: p.total > 0 ? Math.round(p.wins / p.total * 100) : 0,
        }))
        // Sort by ELO primarily, wins as tiebreaker
        .sort((a, b) => b.elo - a.elo || b.wins - a.wins)
        .slice(0, 20)

      setBoard(sorted)
    } finally {
      setLoading(false)
    }
  }, [sport, tier, selectedCourt, selectedCity, selectedProvince])

  useEffect(() => { fetchOptions() }, [fetchOptions])
  useEffect(() => { fetchBoard()   }, [fetchBoard])

  const sportEmoji = SPORTS.find(s => s.id === sport)?.emoji || '🏸'
  const TierIcon   = TIERS.find(t => t.id === tier)?.icon || Trophy

  const contextLabel = {
    court:    selectedCourt    || 'Select a court',
    city:     selectedCity     || 'Select a city',
    province: selectedProvince || 'Select a province',
    national: 'Philippines',
    global:   'Worldwide',
  }[tier]

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={20} className="text-accent" />
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Rankings</h1>
        </div>
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">
          ELO-based · Court · City · Province · National · Global
        </p>
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
                  tier === t.id ? 'bg-accent text-ink-900' : 'text-ink-300 hover:text-white'
                }`}
              >
                <Icon size={12} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scope selectors */}
      {tier === 'court' && (
        courtOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">
              No courts yet — log a match at a court first!
            </p>
          : <ScopeSelector options={courtOptions} selected={selectedCourt} onSelect={setSelectedCourt} emoji="🏟️" />
      )}
      {tier === 'city' && (
        cityOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">
              No cities yet — log a match with location first!
            </p>
          : <ScopeSelector options={cityOptions} selected={selectedCity} onSelect={setSelectedCity} emoji="🏙️" />
      )}
      {tier === 'province' && (
        provinceOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">
              No provinces yet — log a match with location first!
            </p>
          : <ScopeSelector options={provinceOptions} selected={selectedProvince} onSelect={setSelectedProvince} emoji="🗺️" />
      )}

      {/* Context label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} className="text-accent" />
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">{contextLabel}</p>
        <div className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-ink-600">
          <Zap size={10} className="text-accent" />
          ELO Rating
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : board.length === 0 ? (
        <EmptyLeaderboard tier={tier} sport={sport} />
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />

          {board.length > 3 && (
            <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
              {board.slice(3).map((player, i) => {
                const tier_info = getSkillTier(player.elo)
                return (
                  <Link
                    key={player.username + i}
                    to={`/user/${player.username}`}
                    className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none hover:bg-white/3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                      {i + 4}
                    </div>
                    <Avatar user={player} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-display font-bold text-sm text-ink-100 truncate">
                          @{player.username}
                        </p>
                        <ELOBadge elo={player.elo} />
                      </div>
                      <p className="text-[10px] text-ink-400 font-bold flex items-center gap-1">
                        <MapPin size={8} />
                        {player.city}
                        {player.province && player.province !== '—' ? ` · ${player.province}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-lg text-accent italic leading-none">
                        {player.elo}
                      </p>
                      <p className="text-[9px] font-black text-ink-500 uppercase tracking-widest">
                        {player.wins}W · {player.winRate}%
                      </p>
                      <p className="text-[9px] text-ink-600">{player.total} games</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
