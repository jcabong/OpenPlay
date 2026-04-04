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

function calcScore(wins, total) {
  if (total === 0) return 0
  const winRate = wins / total
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

function Podium({ board }) {
  if (board.length < 1) return null
  const first  = board[0]
  const second = board[1]
  const third  = board[2]
  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar name={second.username} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{second.username}</p>
            <p className="font-display font-bold text-lg text-ink-300 leading-none">{second.wins}W</p>
            <p className="text-[9px] text-ink-600">{second.winRate}% WR</p>
          </div>
          <div className="w-full h-14 bg-ink-700 rounded-t-xl flex items-center justify-center">
            <span className="font-display font-bold text-ink-400 text-2xl">2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar name={first.username} size="lg" accent />
        <div className="text-center">
          <p className="text-[9px] font-black text-accent truncate max-w-[80px]">@{first.username}</p>
          <p className="font-display font-bold text-2xl text-accent leading-none">{first.wins}W</p>
          <p className="text-[9px] text-accent/60">{first.winRate}% WR</p>
        </div>
        <div className="w-full h-20 bg-accent/20 border border-accent/30 rounded-t-xl flex items-center justify-center">
          <span className="font-display font-bold text-accent text-2xl">1</span>
        </div>
      </div>

      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar name={third.username} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{third.username}</p>
            <p className="font-display font-bold text-lg text-orange-400 leading-none">{third.wins}W</p>
            <p className="text-[9px] text-ink-600">{third.winRate}% WR</p>
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

  // Fetch all scope options from games
  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name, city, province, user:users!user_id(city)')
      .eq('sport', sport)
      .eq('is_deleted', false)

    if (!data) return

    const courts   = [...new Set(data.map(g => g.court_name).filter(Boolean))].sort()
    const cities   = [...new Set(data.map(g => g.city || g.user?.city || '').filter(Boolean))].sort()
    const provinces = [...new Set(data.map(g => g.province).filter(Boolean))].sort()

    setCourtOptions(courts)
    setCityOptions(cities)
    setProvinceOptions(provinces)

    setSelectedCourt(prev   => courts.includes(prev)    ? prev : (courts[0]    || ''))
    setSelectedCity(prev    => cities.includes(prev)    ? prev : (cities[0]    || ''))
    setSelectedProvince(prev => provinces.includes(prev) ? prev : (provinces[0] || ''))
  }, [sport])

  const fetchBoard = useCallback(async () => {
    if (tier === 'court'    && !selectedCourt)    { setBoard([]); setLoading(false); return }
    if (tier === 'city'     && !selectedCity)     { setBoard([]); setLoading(false); return }
    if (tier === 'province' && !selectedProvince) { setBoard([]); setLoading(false); return }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('user_id, result, city, province, court_name, tagged_opponent_id, user:users!user_id(id, username, city)')
        .eq('sport', sport)
        .eq('is_deleted', false)   // exclude soft-deleted
        .not('tagged_opponent_id', 'is', null) // only verified matches (tagged opponent)

      if (error) {
        console.error('fetchBoard error:', error.message)
        setBoard([])
        setLoading(false)
        return
      }
      if (!data || data.length === 0) { setBoard([]); setLoading(false); return }

      // Filter rows based on tier
      let rows = data
      if (tier === 'court')    rows = data.filter(g => g.court_name === selectedCourt)
      if (tier === 'city')     rows = data.filter(g => (g.city || g.user?.city || '') === selectedCity)
      if (tier === 'province') rows = data.filter(g => g.province === selectedProvince)
      // national + global = all rows

      if (rows.length === 0) { setBoard([]); setLoading(false); return }

      // Tally per player
      const tally = rows.reduce((acc, g) => {
        const id  = g.user_id
        const usr = g.user
        if (!usr) return acc
        if (!acc[id]) acc[id] = {
          username: usr.username || '—',
          city:     g.city || usr.city || '—',
          province: g.province || '—',
          wins:     0,
          total:    0,
        }
        acc[id].total++
        if (g.result === 'win') acc[id].wins++
        if (g.city)     acc[id].city = g.city
        if (g.province) acc[id].province = g.province
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
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">Court · City · Province · National · Global</p>
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
              {board.slice(3).map((player, i) => (
                <div key={player.username + i} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
                  <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                    {i + 4}
                  </div>
                  <Avatar name={player.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-ink-100 truncate">@{player.username}</p>
                    <p className="text-[10px] text-ink-400 font-bold flex items-center gap-1">
                      <MapPin size={8} /> {player.city}{player.province && player.province !== '—' ? ` · ${player.province}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-lg text-accent italic leading-none">{player.wins}W</p>
                    <p className="text-[9px] font-black text-ink-500 uppercase tracking-widest">{player.winRate}% WR</p>
                    <p className="text-[9px] text-ink-500">{player.total} games</p>
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
