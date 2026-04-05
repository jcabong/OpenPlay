import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag, Map } from 'lucide-react'

const TIERS = [
  { id: 'court',    label: 'Court',    icon: Building2 },
  { id: 'city',     label: 'City',     icon: MapPin    },
  { id: 'province', label: 'Province', icon: Map       },
  { id: 'national', label: 'National', icon: Flag      },
  { id: 'global',   label: 'Global',   icon: Globe     },
]

const TIER_COLORS = {
  Beginner:     '#888780',
  Casual:       '#60a5fa',
  Intermediate: '#a78bfa',
  Advanced:     '#fbbf24',
  Elite:        '#c8ff00',
}

function Avatar({ user, size = 'md', accent = false }) {
  const username = user?.username || '?'
  const initial  = username.charAt(0).toUpperCase()
  const hasAvatar = user?.avatar_url && user?.avatar_type !== 'initials'

  const sz = size === 'lg' ? 'w-14 h-14 text-xl rounded-[1.25rem]'
           : size === 'sm' ? 'w-9 h-9 text-sm rounded-xl'
           : 'w-12 h-12 text-lg rounded-[1rem]'

  if (hasAvatar) {
    return (
      <div className={`${sz} shrink-0 overflow-hidden ${accent ? 'ring-2 ring-accent' : ''}`}>
        <img src={user.avatar_url} alt={username} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`${sz} flex items-center justify-center font-bold shrink-0 ${
      accent ? 'bg-accent text-ink-900' : 'bg-ink-700 text-ink-300'
    }`}>
      {initial}
    </div>
  )
}

function SkillBadge({ tier }) {
  const color = TIER_COLORS[tier] || TIER_COLORS.Casual
  return (
    <span
      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
      style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
    >
      {tier}
    </span>
  )
}

function Podium({ board }) {
  if (board.length < 1) return null
  const first  = board[0]
  const second = board[1]
  const third  = board[2]

  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {/* Second Place */}
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={second} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{second.username}</p>
            <p className="font-display font-bold text-lg text-ink-300 leading-none">{second.elo_rating}</p>
            <SkillBadge tier={second.skill_tier} />
          </div>
          <div className="w-full h-14 bg-ink-700 rounded-t-xl flex items-center justify-center">
            <span className="font-display font-bold text-ink-400 text-2xl">2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      {/* First Place */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar user={first} size="lg" accent />
        <div className="text-center">
          <p className="text-[9px] font-black text-accent truncate max-w-[80px]">@{first.username}</p>
          <p className="font-display font-bold text-2xl text-accent leading-none">{first.elo_rating}</p>
          <SkillBadge tier={first.skill_tier} />
        </div>
        <div className="w-full h-20 bg-accent/20 border border-accent/30 rounded-t-xl flex items-center justify-center">
          <span className="font-display font-bold text-accent text-2xl">1</span>
        </div>
      </div>

      {/* Third Place */}
      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={third} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{third.username}</p>
            <p className="font-display font-bold text-lg text-orange-400 leading-none">{third.elo_rating}</p>
            <SkillBadge tier={third.skill_tier} />
          </div>
          <div className="w-full h-10 bg-orange-900/30 border border-orange-600/20 rounded-t-xl flex items-center justify-center">
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

export default function LeaderboardPage() {
  const [sport, setSport]                   = useState('badminton')
  const [tier, setTier]                     = useState('national')
  const [board, setBoard]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [courtOptions, setCourtOptions]     = useState([])
  const [selectedCourt, setSelectedCourt]   = useState('')
  const [cityOptions, setCityOptions]       = useState([])
  const [selectedCity, setSelectedCity]     = useState('')
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
      // Pull games to get scope-filtered player IDs, join user ELO data
      const { data, error } = await supabase
        .from('games')
        .select(`
          user_id, result, city, province, court_name,
          user:users!user_id(id, username, city, elo_rating, skill_tier, avatar_url, avatar_type)
        `)
        .eq('sport', sport)
        .eq('is_deleted', false)
        .not('tagged_opponent_id', 'is', null)

      if (error) {
        console.error('fetchBoard error:', error.message)
        setBoard([])
        setLoading(false)
        return
      }
      if (!data || data.length === 0) { setBoard([]); setLoading(false); return }

      // Filter by tier scope
      let rows = data
      if (tier === 'court')    rows = data.filter(g => g.court_name === selectedCourt)
      if (tier === 'city')     rows = data.filter(g => (g.city || g.user?.city || '') === selectedCity)
      if (tier === 'province') rows = data.filter(g => g.province === selectedProvince)

      if (rows.length === 0) { setBoard([]); setLoading(false); return }

      // Dedupe by user_id — use live elo_rating from users table, tally wins/games for context
      const seen = {}
      rows.forEach(g => {
        if (!g.user) return
        const uid = g.user_id
        if (!seen[uid]) {
          seen[uid] = {
            id:          uid,
            username:    g.user.username    || '—',
            avatar_url:  g.user.avatar_url,
            avatar_type: g.user.avatar_type,
            city:        g.city || g.user.city || '—',
            province:    g.province          || '—',
            elo_rating:  g.user.elo_rating   ?? 1000,
            skill_tier:  g.user.skill_tier   ?? 'Casual',
            wins:        0,
            total:       0,
          }
        }
        seen[uid].total++
        if (g.result === 'win') seen[uid].wins++
        // Keep most specific location data
        if (g.city)     seen[uid].city     = g.city
        if (g.province) seen[uid].province = g.province
      })

      const sorted = Object.values(seen)
        .map(p => ({
          ...p,
          winRate: p.total > 0 ? Math.round(p.wins / p.total * 100) : 0,
        }))
        .sort((a, b) => b.elo_rating - a.elo_rating)
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
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">ELO · Court · City · Province · National · Global</p>
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
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No courts yet — log a match at a court first!</p>
          : <ScopeSelector options={courtOptions} selected={selectedCourt} onSelect={setSelectedCourt} emoji="🏟️" />
      )}
      {tier === 'city' && (
        cityOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No cities yet — log a match with a location first!</p>
          : <ScopeSelector options={cityOptions} selected={selectedCity} onSelect={setSelectedCity} emoji="🏙️" />
      )}
      {tier === 'province' && (
        provinceOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No provinces yet — log a match with a location first!</p>
          : <ScopeSelector options={provinceOptions} selected={selectedProvince} onSelect={setSelectedProvince} emoji="🗺️" />
      )}

      {/* Context label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} className="text-accent" />
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">{contextLabel}</p>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">{sportEmoji}</p>
          <p className="text-ink-300 font-black uppercase text-xs tracking-widest">No data yet</p>
          <p className="text-ink-700 text-xs mt-1">
            {tier === 'court'    ? 'Log a match at this court!' :
             tier === 'city'     ? 'No players found in this city yet.' :
             tier === 'province' ? 'No players found in this province yet.' :
             'Be the first to log a match!'}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />
          {board.length > 3 && (
            <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
              {/* Column header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-7 shrink-0" />
                <div className="w-9 shrink-0" />
                <p className="flex-1 text-[8px] font-black uppercase tracking-widest text-ink-600">Player</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-ink-600 text-right">ELO · Tier · W/G</p>
              </div>

              {board.slice(3).map((player, i) => (
                <div key={player.id || player.username + i} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
                  <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                    {i + 4}
                  </div>
                  <Avatar user={player} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-ink-100 truncate">@{player.username}</p>
                    <p className="text-[10px] text-ink-400 font-bold flex items-center gap-1">
                      <MapPin size={8} /> {player.city}{player.province && player.province !== '—' ? ` · ${player.province}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg text-accent italic leading-none">{player.elo_rating}</p>
                    <SkillBadge tier={player.skill_tier} />
                    <p className="text-[9px] text-ink-500 mt-0.5">{player.wins}W · {player.total}G</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
