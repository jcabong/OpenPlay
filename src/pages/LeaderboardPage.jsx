import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag, Map, TrendingUp } from 'lucide-react'

const TIERS = [
  { id: 'court',    label: 'Court',    icon: Building2 },
  { id: 'city',     label: 'City',     icon: MapPin    },
  { id: 'province', label: 'Province', icon: Map       },
  { id: 'national', label: 'National', icon: Flag      },
  { id: 'global',   label: 'Global',   icon: Globe     },
]

function eloTierInfo(elo) {
  if (elo >= 1400) return { label: 'Elite',    color: '#f59e0b' }
  if (elo >= 1200) return { label: 'Advanced', color: '#c8ff00' }
  if (elo >= 1100) return { label: 'Skilled',  color: '#60a5fa' }
  if (elo >= 1000) return { label: 'Ranked',   color: '#a78bfa' }
  return                   { label: 'Rookie',  color: 'rgba(255,255,255,0.4)' }
}

function Avatar({ user, size = 'md', accent = false }) {
  const username  = user?.username || '?'
  const initial   = username.charAt(0).toUpperCase()
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
    <div className={`${sz} flex items-center justify-center font-bold shrink-0 ${accent ? 'bg-accent text-ink-900' : 'bg-ink-700 text-ink-300'}`}>
      {initial}
    </div>
  )
}

function Podium({ board }) {
  if (board.length < 1) return null
  const [first, second, third] = board
  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={second} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{second.username}</p>
            <p className="font-display font-bold text-lg text-ink-300 leading-none">{second.elo}</p>
            <p className="text-[9px] text-ink-600">{second.wins}W · {second.losses}L</p>
          </div>
          <div className="w-full h-14 bg-ink-700 rounded-t-xl flex items-center justify-center">
            <span className="font-display font-bold text-ink-400 text-2xl">2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar user={first} size="lg" accent />
        <div className="text-center">
          <p className="text-[9px] font-black text-accent truncate max-w-[80px]">@{first.username}</p>
          <p className="font-display font-bold text-2xl text-accent leading-none">{first.elo}</p>
          <p className="text-[9px] text-accent/60">{first.wins}W · {first.losses}L</p>
        </div>
        <div className="w-full h-20 bg-accent/20 border border-accent/30 rounded-t-xl flex items-center justify-center">
          <span className="font-display font-bold text-accent text-2xl">1</span>
        </div>
      </div>

      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={third} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{third.username}</p>
            <p className="font-display font-bold text-lg text-orange-400 leading-none">{third.elo}</p>
            <p className="text-[9px] text-ink-600">{third.wins}W · {third.losses}L</p>
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
        <button key={o} onClick={() => onSelect(o)}
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
            selected === o ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'
          }`}>
          {emoji} {o}
        </button>
      ))}
    </div>
  )
}

// ── Main ELO board fetch (from player_elo) ───────────────────────────────────
async function fetchEloBoard({ sport, scope, selectedCourt, selectedCity, selectedProvince }) {
  if (scope === 'national' || scope === 'global') {
    // Direct ELO leaderboard — no location filter
    const { data, error } = await supabase
      .from('player_elo')
      .select(`
        elo_rating, matches_played, wins, losses, sport,
        user:users!player_elo_user_id_fkey(id, username, display_name, city, province, avatar_url, avatar_type)
      `)
      .eq('sport', sport)
      .gte('matches_played', 1)
      .order('elo_rating', { ascending: false })
      .limit(20)

    if (error) { console.error('ELO board error:', error.message); return [] }

    return (data || [])
      .filter(r => r.user)
      .map(r => ({
        id:          r.user.id,
        username:    r.user.username    || '—',
        display_name: r.user.display_name,
        avatar_url:  r.user.avatar_url,
        avatar_type: r.user.avatar_type,
        city:        r.user.city        || '—',
        province:    r.user.province    || '—',
        elo:         r.elo_rating,
        wins:        r.wins,
        losses:      r.losses,
        total:       r.matches_played,
        winRate:     r.matches_played > 0 ? Math.round(r.wins / r.matches_played * 100) : 0,
      }))
  }

  // Location-scoped: find user IDs from games table, then pull their ELO
  const scopeField = scope === 'court' ? 'court_name' : scope === 'city' ? 'city' : 'province'
  const scopeValue = scope === 'court' ? selectedCourt : scope === 'city' ? selectedCity : selectedProvince

  if (!scopeValue) return []

  // Distinct user IDs that played in this location
  const { data: gamesData, error: gamesError } = await supabase
    .from('games')
    .select('user_id')
    .eq('sport', sport)
    .eq('is_deleted', false)
    .not('tagged_opponent_id', 'is', null)  // only ranked matches
    .eq(scopeField, scopeValue)

  if (gamesError || !gamesData?.length) return []

  const userIds = [...new Set(gamesData.map(g => g.user_id))]

  const { data: eloData, error: eloError } = await supabase
    .from('player_elo')
    .select(`
      elo_rating, matches_played, wins, losses,
      user:users!player_elo_user_id_fkey(id, username, display_name, city, province, avatar_url, avatar_type)
    `)
    .eq('sport', sport)
    .in('user_id', userIds)
    .gte('matches_played', 1)
    .order('elo_rating', { ascending: false })
    .limit(20)

  if (eloError) { console.error('Scoped ELO error:', eloError.message); return [] }

  return (eloData || [])
    .filter(r => r.user)
    .map(r => ({
      id:          r.user.id,
      username:    r.user.username    || '—',
      display_name: r.user.display_name,
      avatar_url:  r.user.avatar_url,
      avatar_type: r.user.avatar_type,
      city:        r.user.city        || '—',
      province:    r.user.province    || '—',
      elo:         r.elo_rating,
      wins:        r.wins,
      losses:      r.losses,
      total:       r.matches_played,
      winRate:     r.matches_played > 0 ? Math.round(r.wins / r.matches_played * 100) : 0,
    }))
}

export default function LeaderboardPage() {
  const [sport, setSport]                       = useState('badminton')
  const [tier, setTier]                         = useState('national')
  const [board, setBoard]                       = useState([])
  const [loading, setLoading]                   = useState(true)
  const [courtOptions, setCourtOptions]         = useState([])
  const [selectedCourt, setSelectedCourt]       = useState('')
  const [cityOptions, setCityOptions]           = useState([])
  const [selectedCity, setSelectedCity]         = useState('')
  const [provinceOptions, setProvinceOptions]   = useState([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [lastRefresh, setLastRefresh]           = useState(Date.now())

  // Fetch location scope options from games
  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name, city, province')
      .eq('sport', sport)
      .eq('is_deleted', false)
      .not('tagged_opponent_id', 'is', null)
      .limit(1000)

    if (!data) return
    const courts    = [...new Set(data.map(g => g.court_name).filter(Boolean))].sort()
    const cities    = [...new Set(data.map(g => g.city).filter(Boolean))].sort()
    const provinces = [...new Set(data.map(g => g.province).filter(Boolean))].sort()
    setCourtOptions(courts)
    setCityOptions(cities)
    setProvinceOptions(provinces)
    setSelectedCourt(prev    => courts.includes(prev)    ? prev : (courts[0]    || ''))
    setSelectedCity(prev     => cities.includes(prev)    ? prev : (cities[0]    || ''))
    setSelectedProvince(prev => provinces.includes(prev) ? prev : (provinces[0] || ''))
  }, [sport])

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    const result = await fetchEloBoard({
      sport,
      scope:          tier,
      selectedCourt,
      selectedCity,
      selectedProvince,
    })
    setBoard(result)
    setLoading(false)
  }, [sport, tier, selectedCourt, selectedCity, selectedProvince])

  useEffect(() => { fetchOptions() }, [fetchOptions])
  useEffect(() => { fetchBoard()   }, [fetchBoard, lastRefresh])

  // Realtime: refresh when player_elo or games change
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_elo' },
        () => setLastRefresh(Date.now()))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games' },
        () => setLastRefresh(Date.now()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const sportEmoji   = SPORTS.find(s => s.id === sport)?.emoji || '🏸'
  const TierIcon     = TIERS.find(t => t.id === tier)?.icon || Trophy
  const contextLabel = {
    court:    selectedCourt    || 'Select a court',
    city:     selectedCity     || 'Select a city',
    province: selectedProvince || 'Select a province',
    national: 'Philippines',
    global:   'Worldwide',
  }[tier]

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">

      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={20} className="text-accent" />
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Rankings</h1>
        </div>
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">ELO Rating · Per Sport · Per Location</p>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {SPORTS.map(s => (
          <button key={s.id} onClick={() => setSport(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${
              sport === s.id ? 'bg-accent text-ink-900 border-accent scale-105' : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'
            }`}>
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
              <button key={t.id} onClick={() => setTier(t.id)}
                className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${
                  tier === t.id ? 'bg-accent text-ink-900' : 'text-ink-300 hover:text-white'
                }`}>
                <Icon size={12} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scope selectors */}
      {tier === 'court' && (courtOptions.length === 0
        ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No courts yet — log a ranked match at a court first!</p>
        : <ScopeSelector options={courtOptions} selected={selectedCourt} onSelect={setSelectedCourt} emoji="🏟️" />
      )}
      {tier === 'city' && (cityOptions.length === 0
        ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No cities yet!</p>
        : <ScopeSelector options={cityOptions} selected={selectedCity} onSelect={setSelectedCity} emoji="🏙️" />
      )}
      {tier === 'province' && (provinceOptions.length === 0
        ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No provinces yet!</p>
        : <ScopeSelector options={provinceOptions} selected={selectedProvince} onSelect={setSelectedProvince} emoji="🗺️" />
      )}

      {/* Context label + refresh indicator */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} className="text-accent" />
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">{contextLabel}</p>
        <div className="ml-auto flex items-center gap-1">
          <TrendingUp size={10} className="text-accent" />
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">
            Live ELO · {SPORTS.find(s => s.id === sport)?.label}
          </p>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
      ) : board.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">{sportEmoji}</p>
          <p className="text-ink-300 font-black uppercase text-xs tracking-widest">No ranked players yet</p>
          <p className="text-ink-700 text-xs mt-1">Log a match with a tagged opponent to earn an ELO rating</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />
          {board.length > 3 && (
            <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
              {board.slice(3).map((player, i) => {
                const info = eloTierInfo(player.elo)
                return (
                  <div key={player.id} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
                    <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                      {i + 4}
                    </div>
                    <Avatar user={player} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm text-ink-100 truncate">
                        @{player.username}
                        {player.display_name && player.display_name !== player.username && (
                          <span className="font-normal text-ink-500 ml-1 text-xs">{player.display_name}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-ink-400 font-bold flex items-center gap-1">
                        <MapPin size={8} /> {player.city}{player.province && player.province !== '—' ? ` · ${player.province}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-lg italic leading-none" style={{ color: info.color }}>
                        {player.elo}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: info.color, opacity: 0.7 }}>
                        {info.label}
                      </p>
                      <p className="text-[9px] text-ink-500">{player.wins}W {player.losses}L · {player.winRate}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
