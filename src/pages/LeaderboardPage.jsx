import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag, Map, TrendingUp } from 'lucide-react'

const C = {
  white:  '#ffffff',
  accent: '#c8ff00',
  dim1:   'rgba(255,255,255,0.7)',
  dim2:   'rgba(255,255,255,0.5)',
  dim3:   'rgba(255,255,255,0.35)',
  dim4:   'rgba(255,255,255,0.2)',
  surface: 'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.1)',
}

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
  return                   { label: 'Rookie',  color: 'rgba(255,255,255,0.45)' }
}

function Avatar({ user, size = 'md', accent = false }) {
  const username  = user?.username || '?'
  const initial   = username.charAt(0).toUpperCase()
  const hasAvatar = user?.avatar_url && user?.avatar_type !== 'initials'
  const sz = size === 'lg' ? 'w-14 h-14 rounded-[1.25rem]'
           : size === 'sm' ? 'w-9 h-9 rounded-xl'
           : 'w-12 h-12 rounded-[1rem]'
  const ringStyle = accent ? { outline: '2px solid #c8ff00', outlineOffset: '2px' } : {}
  if (hasAvatar) {
    return (
      <div className={`${sz} shrink-0 overflow-hidden`} style={ringStyle}>
        <img src={user.avatar_url} alt={username} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${sz} flex items-center justify-center font-bold text-sm shrink-0`}
      style={{ ...ringStyle, background: accent ? '#c8ff00' : 'rgba(255,255,255,0.1)', color: accent ? '#0a0a0f' : C.dim2 }}>
      {initial}
    </div>
  )
}

function Podium({ board }) {
  if (!board.length) return null
  const [first, second, third] = board
  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={second} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black truncate max-w-[80px]" style={{ color: C.dim2 }}>@{second.username}</p>
            <p className="font-display font-bold text-lg leading-none" style={{ color: C.dim1 }}>{second.elo}</p>
            <p className="text-[9px]" style={{ color: C.dim3 }}>{second.wins}W · {second.losses}L</p>
          </div>
          <div className="w-full h-14 rounded-t-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="font-display font-bold text-2xl" style={{ color: C.dim2 }}>2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar user={first} size="lg" accent />
        <div className="text-center">
          <p className="text-[9px] font-black truncate max-w-[80px]" style={{ color: C.accent }}>@{first.username}</p>
          <p className="font-display font-bold text-2xl leading-none" style={{ color: C.accent }}>{first.elo}</p>
          <p className="text-[9px]" style={{ color: 'rgba(200,255,0,0.6)' }}>{first.wins}W · {first.losses}L</p>
        </div>
        <div className="w-full h-20 rounded-t-xl flex items-center justify-center border"
          style={{ background: 'rgba(200,255,0,0.12)', borderColor: 'rgba(200,255,0,0.25)' }}>
          <span className="font-display font-bold text-2xl" style={{ color: C.accent }}>1</span>
        </div>
      </div>

      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={third} size="md" />
          <div className="text-center">
            <p className="text-[9px] font-black truncate max-w-[80px]" style={{ color: C.dim2 }}>@{third.username}</p>
            <p className="font-display font-bold text-lg leading-none" style={{ color: '#f59e0b' }}>{third.elo}</p>
            <p className="text-[9px]" style={{ color: C.dim3 }}>{third.wins}W · {third.losses}L</p>
          </div>
          <div className="w-full h-10 rounded-t-xl flex items-center justify-center border"
            style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
            <span className="font-display font-bold text-xl" style={{ color: '#f59e0b' }}>3</span>
          </div>
        </div>
      ) : <div className="flex-1" />}
    </div>
  )
}

function ScopeSelector({ options, selected, onSelect, emoji }) {
  if (!options.length) return null
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-5 mb-4">
      {options.map(o => (
        <button key={o} onClick={() => onSelect(o)}
          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all"
          style={selected === o
            ? { background: C.accent, borderColor: C.accent, color: '#0a0a0f' }
            : { background: C.surface, borderColor: C.border, color: C.dim2 }}>
          {emoji} {o}
        </button>
      ))}
    </div>
  )
}

// ── Fetch player_elo records with user info ───────────────────────────────────
// Uses a 2-step query to avoid FK name issues: first get player_elo rows,
// then enrich with user data via a separate users query.
async function fetchEloWithUsers({ sport, userIdFilter }) {
  let query = supabase
    .from('player_elo')
    .select('user_id, elo_rating, wins, losses, matches_played')
    .eq('sport', sport)
    .gte('matches_played', 1)
    .order('elo_rating', { ascending: false })
    .limit(20)

  if (userIdFilter?.length) query = query.in('user_id', userIdFilter)

  const { data: eloRows, error } = await query
  if (error) { console.error('player_elo fetch error:', error.message); return [] }
  if (!eloRows?.length) return []

  // Fetch user details separately — avoids FK name dependency
  const ids = eloRows.map(r => r.user_id)
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, username, display_name, city, province, avatar_url, avatar_type')
    .in('id', ids)

  if (uErr) { console.error('users fetch error:', uErr.message); return [] }

  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

  return eloRows
    .map(r => {
      const u = userMap[r.user_id]
      if (!u) return null
      return {
        id:          u.id,
        username:    u.username    || '—',
        display_name: u.display_name,
        avatar_url:  u.avatar_url,
        avatar_type: u.avatar_type,
        city:        u.city        || '',
        province:    u.province    || '',
        elo:         r.elo_rating,
        wins:        r.wins,
        losses:      r.losses,
        total:       r.matches_played,
        winRate:     r.matches_played > 0 ? Math.round(r.wins / r.matches_played * 100) : 0,
      }
    })
    .filter(Boolean)
}

async function fetchEloBoard({ sport, scope, selectedCourt, selectedCity, selectedProvince }) {
  if (scope === 'national' || scope === 'global') {
    return fetchEloWithUsers({ sport })
  }

  // Location-scoped: find ranked user IDs from games first
  const scopeField = scope === 'court' ? 'court_name' : scope === 'city' ? 'city' : 'province'
  const scopeValue = scope === 'court' ? selectedCourt : scope === 'city' ? selectedCity : selectedProvince
  if (!scopeValue) return []

  const { data: gamesData, error: gErr } = await supabase
    .from('games')
    .select('user_id')
    .eq('sport', sport)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .not('tagged_opponent_id', 'is', null)
    .eq(scopeField, scopeValue)

  if (gErr) { console.error('games scope fetch error:', gErr.message); return [] }
  if (!gamesData?.length) return []

  const userIds = [...new Set(gamesData.map(g => g.user_id))]
  return fetchEloWithUsers({ sport, userIdFilter: userIds })
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

  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name, city, province')
      .eq('sport', sport)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .not('tagged_opponent_id', 'is', null)
      .limit(2000)

    if (!data) return
    const courts    = [...new Set(data.map(g => g.court_name).filter(Boolean))].sort()
    const cities    = [...new Set(data.map(g => g.city).filter(Boolean))].sort()
    const provinces = [...new Set(data.map(g => g.province).filter(Boolean))].sort()
    setCourtOptions(courts)
    setCityOptions(cities)
    setProvinceOptions(provinces)
    setSelectedCourt(p    => courts.includes(p)    ? p : (courts[0]    || ''))
    setSelectedCity(p     => cities.includes(p)    ? p : (cities[0]    || ''))
    setSelectedProvince(p => provinces.includes(p) ? p : (provinces[0] || ''))
  }, [sport])

  const loadBoard = useCallback(async () => {
    setLoading(true)
    const result = await fetchEloBoard({ sport, scope: tier, selectedCourt, selectedCity, selectedProvince })
    setBoard(result)
    setLoading(false)
  }, [sport, tier, selectedCourt, selectedCity, selectedProvince])

  useEffect(() => { fetchOptions() }, [fetchOptions])
  useEffect(() => { loadBoard()    }, [loadBoard])

  // Realtime refresh when ELO changes
  useEffect(() => {
    const ch = supabase.channel('lb-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_elo' }, () => loadBoard())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadBoard])

  const sportEmoji   = SPORTS.find(s => s.id === sport)?.emoji || '🏸'
  const TierIcon     = TIERS.find(t => t.id === tier)?.icon || Trophy
  const contextLabel = { court: selectedCourt || '—', city: selectedCity || '—', province: selectedProvince || '—', national: 'Philippines', global: 'Worldwide' }[tier]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>

      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={20} style={{ color: C.accent }} />
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter" style={{ color: C.white }}>Rankings</h1>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.accent, opacity: 0.8 }}>ELO Rating · Per Sport · Per Location</p>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {SPORTS.map(s => (
          <button key={s.id} onClick={() => setSport(s.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200"
            style={sport === s.id
              ? { background: C.accent, borderColor: C.accent, color: '#0a0a0f', transform: 'scale(1.05)' }
              : { background: C.surface, borderColor: C.border, color: C.dim2 }}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Tier tabs */}
      <div className="px-5 mb-4">
        <div className="flex rounded-2xl overflow-hidden border glass" style={{ borderColor: C.border }}>
          {TIERS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTier(t.id)}
                className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1"
                style={tier === t.id ? { background: C.accent, color: '#0a0a0f' } : { color: C.dim2 }}>
                <Icon size={12} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scope selectors */}
      {tier === 'court'    && (courtOptions.length    === 0 ? <p className="text-xs font-bold text-center py-2 px-5" style={{ color: C.dim3 }}>No courts yet</p>    : <ScopeSelector options={courtOptions}    selected={selectedCourt}    onSelect={setSelectedCourt}    emoji="🏟️" />)}
      {tier === 'city'     && (cityOptions.length     === 0 ? <p className="text-xs font-bold text-center py-2 px-5" style={{ color: C.dim3 }}>No cities yet</p>     : <ScopeSelector options={cityOptions}     selected={selectedCity}     onSelect={setSelectedCity}     emoji="🏙️" />)}
      {tier === 'province' && (provinceOptions.length === 0 ? <p className="text-xs font-bold text-center py-2 px-5" style={{ color: C.dim3 }}>No provinces yet</p>  : <ScopeSelector options={provinceOptions} selected={selectedProvince} onSelect={setSelectedProvince} emoji="🗺️" />)}

      {/* Context label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} style={{ color: C.accent }} />
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>{contextLabel}</p>
        <div className="ml-auto flex items-center gap-1">
          <TrendingUp size={10} style={{ color: C.accent }} />
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>Live ELO · {SPORTS.find(s => s.id === sport)?.label}</p>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" size={28} style={{ color: C.accent }} /></div>
      ) : board.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">{sportEmoji}</p>
          <p className="font-black uppercase text-xs tracking-widest" style={{ color: C.dim2 }}>No ranked players yet</p>
          <p className="text-xs mt-1" style={{ color: C.dim4 }}>Log a match with a tagged opponent to earn an ELO rating</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />
          {board.length > 3 && (
            <div className="rounded-[1.5rem] border overflow-hidden glass" style={{ borderColor: C.border }}>
              {board.slice(3).map((player, i) => {
                const info = eloTierInfo(player.elo)
                return (
                  <div key={player.id} className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)', color: C.dim2 }}>
                      {i + 4}
                    </div>
                    <Avatar user={player} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm truncate" style={{ color: C.white }}>
                        @{player.username}
                        {player.display_name && player.display_name !== player.username && (
                          <span className="font-normal text-xs ml-1" style={{ color: C.dim2 }}>{player.display_name}</span>
                        )}
                      </p>
                      {(player.city || player.province) && (
                        <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: C.dim3 }}>
                          <MapPin size={8} /> {[player.city, player.province].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-lg italic leading-none" style={{ color: info.color }}>{player.elo}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: info.color, opacity: 0.7 }}>{info.label}</p>
                      <p className="text-[9px]" style={{ color: C.dim3 }}>{player.wins}W {player.losses}L · {player.winRate}%</p>
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
