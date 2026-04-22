import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Loader2, MapPin, Building2, Globe, Flag, Map } from 'lucide-react'

// ── Tier config ──────────────────────────────────────────────────────────────
const TIERS = {
  Bronze:   { color: '#cd7f32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.35)',  emoji: '🥉', min: 0    },
  Silver:   { color: '#a0aec0', bg: 'rgba(160,174,192,0.15)', border: 'rgba(160,174,192,0.35)', emoji: '🥈', min: 900  },
  Gold:     { color: '#f6e05e', bg: 'rgba(246,224,94,0.15)',  border: 'rgba(246,224,94,0.35)',  emoji: '🥇', min: 1100 },
  Platinum: { color: '#76e4f7', bg: 'rgba(118,228,247,0.15)', border: 'rgba(118,228,247,0.35)', emoji: '💎', min: 1300 },
  Diamond:  { color: '#90cdf4', bg: 'rgba(144,205,244,0.15)', border: 'rgba(144,205,244,0.35)', emoji: '💠', min: 1600 },
  Legend:   { color: '#c8ff00', bg: 'rgba(200,255,0,0.15)',   border: 'rgba(200,255,0,0.35)',   emoji: '👑', min: 2000 },
}

function getTier(elo) {
  if (elo >= 2000) return 'Legend'
  if (elo >= 1600) return 'Diamond'
  if (elo >= 1300) return 'Platinum'
  if (elo >= 1100) return 'Gold'
  if (elo >= 900)  return 'Silver'
  return 'Bronze'
}

function TierBadge({ tier, small = false }) {
  const cfg = TIERS[tier] || TIERS.Bronze
  return (
    <span className={`inline-flex items-center gap-0.5 font-black uppercase rounded-lg border ${small ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.emoji} {tier}
    </span>
  )
}

const TIERS_LIST = [
  { id: 'court',    label: 'Court',    icon: Building2 },
  { id: 'city',     label: 'City',     icon: MapPin    },
  { id: 'province', label: 'Province', icon: Map       },
  { id: 'national', label: 'National', icon: Flag      },
  { id: 'global',   label: 'Global',   icon: Globe     },
]

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'md', glowColor }) {
  const username = user?.username || '?'
  const initial  = username.charAt(0).toUpperCase()
  const hasAvatar = user?.avatar_url && user?.avatar_type !== 'initials'
  const sz = size === 'lg' ? 'w-14 h-14 text-xl rounded-[1.25rem]'
           : size === 'sm' ? 'w-9 h-9 text-sm rounded-xl'
           : 'w-12 h-12 text-lg rounded-[1rem]'
  const style = glowColor ? { boxShadow: `0 0 16px ${glowColor}40`, border: `2px solid ${glowColor}60` } : {}
  if (hasAvatar) {
    return (
      <div className={`${sz} shrink-0 overflow-hidden`} style={style}>
        <img src={user.avatar_url} alt={username} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${sz} flex items-center justify-center font-bold shrink-0 bg-ink-700 text-ink-300`} style={style}>
      {initial}
    </div>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ board }) {
  if (!board.length) return null
  const first  = board[0]
  const second = board[1]
  const third  = board[2]
  const firstTierCfg  = TIERS[first?.skill_tier]  || TIERS.Bronze
  const secondTierCfg = TIERS[second?.skill_tier] || TIERS.Bronze
  const thirdTierCfg  = TIERS[third?.skill_tier]  || TIERS.Bronze

  return (
    <div className="flex items-end gap-2 mb-6 px-2">
      {/* 2nd */}
      {second ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={second} size="md" glowColor={secondTierCfg.color} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{second.username}</p>
            <p className="font-display font-bold text-xl leading-none" style={{ color: secondTierCfg.color }}>{second.elo_rating}</p>
            <TierBadge tier={second.skill_tier} small />
            <p className="text-[9px] text-ink-600 mt-0.5">{second.wins}W · {second.losses}L</p>
          </div>
          <div className="w-full h-14 rounded-t-xl flex items-center justify-center"
            style={{ background: secondTierCfg.bg, border: `1px solid ${secondTierCfg.border}` }}>
            <span className="font-display font-bold text-2xl" style={{ color: secondTierCfg.color }}>2</span>
          </div>
        </div>
      ) : <div className="flex-1" />}

      {/* 1st */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="text-2xl">👑</div>
        <Avatar user={first} size="lg" glowColor={firstTierCfg.color} />
        <div className="text-center">
          <p className="text-[9px] font-black truncate max-w-[80px]" style={{ color: firstTierCfg.color }}>@{first.username}</p>
          <p className="font-display font-bold text-2xl leading-none" style={{ color: firstTierCfg.color }}>{first.elo_rating}</p>
          <TierBadge tier={first.skill_tier} />
          <p className="text-[9px] text-ink-500 mt-0.5">{first.wins}W · {first.losses}L</p>
        </div>
        <div className="w-full h-20 rounded-t-xl flex items-center justify-center"
          style={{ background: firstTierCfg.bg, border: `1px solid ${firstTierCfg.border}` }}>
          <span className="font-display font-bold text-2xl" style={{ color: firstTierCfg.color }}>1</span>
        </div>
      </div>

      {/* 3rd */}
      {third ? (
        <div className="flex-1 flex flex-col items-center gap-2">
          <Avatar user={third} size="md" glowColor={thirdTierCfg.color} />
          <div className="text-center">
            <p className="text-[9px] font-black text-ink-400 truncate max-w-[80px]">@{third.username}</p>
            <p className="font-display font-bold text-xl leading-none" style={{ color: thirdTierCfg.color }}>{third.elo_rating}</p>
            <TierBadge tier={third.skill_tier} small />
            <p className="text-[9px] text-ink-600 mt-0.5">{third.wins}W · {third.losses}L</p>
          </div>
          <div className="w-full h-10 rounded-t-xl flex items-center justify-center"
            style={{ background: thirdTierCfg.bg, border: `1px solid ${thirdTierCfg.border}` }}>
            <span className="font-display font-bold text-xl" style={{ color: thirdTierCfg.color }}>3</span>
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
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all ${
            selected === o ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'
          }`}>
          {emoji} {o}
        </button>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="px-4 space-y-2 animate-pulse">
      <div className="flex items-end gap-2 mb-6 px-2">
        {[60, 80, 48].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <div className="w-full rounded-t-xl bg-white/10" style={{ height: h }} />
          </div>
        ))}
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3 border border-white/10">
          <div className="w-7 h-7 rounded-lg bg-white/10" />
          <div className="w-9 h-9 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/10 rounded w-24" />
            <div className="h-2 bg-white/5 rounded w-16" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-4 bg-white/10 rounded w-12" />
            <div className="h-2 bg-white/5 rounded w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user } = useAuth()
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

  // Fetch scope options for dropdowns
  const fetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('court_name, city, province, user:users!user_id(city)')
      .eq('sport', sport)
      .eq('is_deleted', false)
    if (!data) return
    const courts    = [...new Set(data.map(g => g.court_name).filter(Boolean))].sort()
    const cities    = [...new Set(data.map(g => g.city || g.user?.city || '').filter(Boolean))].sort()
    const provinces = [...new Set(data.map(g => g.province).filter(Boolean))].sort()
    setCourtOptions(courts)
    setCityOptions(cities)
    setProvinceOptions(provinces)
    setSelectedCourt(prev   => courts.includes(prev)    ? prev : (courts[0]    || ''))
    setSelectedCity(prev    => cities.includes(prev)    ? prev : (cities[0]    || ''))
    setSelectedProvince(prev => provinces.includes(prev) ? prev : (provinces[0] || ''))
  }, [sport])

  // Fetch leaderboard — reads from player_elo (authoritative ELO source)
  const fetchBoard = useCallback(async () => {
    if (tier === 'court'    && !selectedCourt)    { setBoard([]); setLoading(false); return }
    if (tier === 'city'     && !selectedCity)     { setBoard([]); setLoading(false); return }
    if (tier === 'province' && !selectedProvince) { setBoard([]); setLoading(false); return }

    setLoading(true)
    try {
      // Build query against player_elo (per-sport ratings) joined with users
      let query = supabase
        .from('player_elo')
        .select(`
          user_id, sport, elo_rating, wins, losses, matches_played, skill_tier,
          user:users!player_elo_user_id_fkey(id, username, city, province, avatar_url, avatar_type)
        `)
        .eq('sport', sport)
        .order('elo_rating', { ascending: false })
        .limit(50)

      const { data, error } = await query
      if (error) { console.error('fetchBoard error:', error.message); setBoard([]); setLoading(false); return }
      if (!data?.length) { setBoard([]); setLoading(false); return }

      // Filter by scope
      let rows = data.filter(r => r.user) // guard against missing joins
      if (tier === 'court') {
        // Need to cross-reference games table for court filter
        const { data: gameData } = await supabase
          .from('games')
          .select('user_id')
          .eq('sport', sport)
          .eq('court_name', selectedCourt)
          .eq('is_deleted', false)
        const courtUserIds = new Set((gameData || []).map(g => g.user_id))
        rows = rows.filter(r => courtUserIds.has(r.user_id))
      } else if (tier === 'city') {
        rows = rows.filter(r => (r.user?.city || '') === selectedCity)
      } else if (tier === 'province') {
        rows = rows.filter(r => (r.user?.province || '') === selectedProvince)
      }
      // national / global: no filter

      const sorted = rows
        .map(r => ({
          user_id:      r.user_id,
          username:     r.user.username || '—',
          avatar_url:   r.user.avatar_url,
          avatar_type:  r.user.avatar_type,
          city:         r.user.city || '—',
          province:     r.user.province || '',
          elo_rating:   r.elo_rating,
          wins:         r.wins,
          losses:       r.losses,
          matches_played: r.matches_played,
          skill_tier:   r.skill_tier || getTier(r.elo_rating),
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
  const TierIcon   = TIERS_LIST.find(t => t.id === tier)?.icon || Trophy

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
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">ELO · Per Sport · Live</p>
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
          {TIERS_LIST.map(t => {
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
      {tier === 'court' && (
        courtOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No courts yet — log a match at a court first!</p>
          : <ScopeSelector options={courtOptions} selected={selectedCourt} onSelect={setSelectedCourt} emoji="🏟️" />
      )}
      {tier === 'city' && (
        cityOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No cities yet!</p>
          : <ScopeSelector options={cityOptions} selected={selectedCity} onSelect={setSelectedCity} emoji="🏙️" />
      )}
      {tier === 'province' && (
        provinceOptions.length === 0
          ? <p className="text-ink-600 text-xs font-bold text-center py-2 px-5">No provinces yet!</p>
          : <ScopeSelector options={provinceOptions} selected={selectedProvince} onSelect={setSelectedProvince} emoji="🗺️" />
      )}

      {/* Context label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <TierIcon size={12} className="text-accent" />
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">
          {contextLabel} · {sportEmoji} {SPORTS.find(s => s.id === sport)?.label} ELO
        </p>
      </div>

      {/* Board */}
      {loading ? (
        <Skeleton />
      ) : board.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">{sportEmoji}</p>
          <p className="text-ink-300 font-black uppercase text-xs tracking-widest">No data yet</p>
          <p className="text-ink-600 text-xs mt-2">
            {tier === 'court'    ? 'Log a tagged match at this court to appear here!' :
             tier === 'city'     ? 'No players with ELO in this city yet.' :
             tier === 'province' ? 'No players with ELO in this province yet.' :
             'Log a match with a tagged opponent to get an ELO rating!'}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <Podium board={board} />
          {board.length > 3 && (
            <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
              {board.slice(3).map((player, i) => {
                const tierCfg = TIERS[player.skill_tier] || TIERS.Bronze
                const isMe    = user?.id === player.user_id
                return (
                  <div key={player.username + i}
                    className={`flex items-center gap-3 p-4 border-b border-white/5 last:border-none ${isMe ? 'bg-accent/5' : ''}`}>
                    <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500 shrink-0">
                      {i + 4}
                    </div>
                    <Avatar user={player} size="sm" glowColor={isMe ? tierCfg.color : undefined} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-display font-bold text-sm truncate ${isMe ? 'text-accent' : 'text-ink-100'}`}>
                        @{player.username}{isMe ? ' (you)' : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TierBadge tier={player.skill_tier} small />
                        {player.city && player.city !== '—' && (
                          <span className="text-[9px] text-ink-500 flex items-center gap-0.5">
                            <MapPin size={8} />{player.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-lg italic leading-none" style={{ color: tierCfg.color }}>
                        {player.elo_rating}
                      </p>
                      <p className="text-[9px] font-black text-ink-500 uppercase">{player.wins}W · {player.losses}L</p>
                      <p className="text-[9px] text-ink-600">{player.matches_played} played</p>
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
