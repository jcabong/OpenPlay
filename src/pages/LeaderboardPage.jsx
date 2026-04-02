import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS, REGIONS, CITIES_BY_REGION } from '../lib/supabase'
import { Trophy, ChevronDown, Loader2 } from 'lucide-react'

const TIER = ['National', 'Region', 'City']

export default function LeaderboardPage() {
  const [sport, setSport]       = useState('badminton')
  const [tier, setTier]         = useState('National')
  const [region, setRegion]     = useState('')
  const [city, setCity]         = useState('')
  const [board, setBoard]       = useState([])
  const [loading, setLoading]   = useState(true)

  const cities = region ? (CITIES_BY_REGION[region] || []) : []

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('games')
      .select('user_id, result, city, region, users!inner(id, username, city, region)')
      .eq('sport', sport)
      .eq('result', 'win')

    if (tier === 'Region' && region) q = q.eq('region', region)
    if (tier === 'City'   && city)   q = q.eq('city', city)

    const { data } = await q
    if (data) {
      const tally = data.reduce((acc, g) => {
        const id  = g.user_id
        const usr = g.users
        if (!acc[id]) acc[id] = { username: usr.username, city: usr.city, region: usr.region, wins: 0 }
        acc[id].wins++
        return acc
      }, {})
      const sorted = Object.entries(tally)
        .map(([, v]) => v)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 20)
      setBoard(sorted)
    }
    setLoading(false)
  }, [sport, tier, region, city])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const medalColors = ['bg-accent text-ink-900', 'bg-ink-400 text-ink-900', 'bg-orange-600 text-white']
  const sportEmoji  = SPORTS.find(s => s.id === sport)?.emoji || '🏸'

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={20} className="text-accent" />
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Rankings</h1>
        </div>
        <p className="text-accent text-[9px] font-black uppercase tracking-widest">By City · Region · Nation</p>
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
          {TIER.map(t => (
            <button
              key={t}
              onClick={() => { setTier(t); if (t === 'National') { setRegion(''); setCity('') } }}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                tier === t ? 'bg-accent text-ink-900' : 'text-ink-500 hover:text-ink-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Location drilldown */}
      {(tier === 'Region' || tier === 'City') && (
        <div className="px-5 mb-4 space-y-2">
          <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 border border-white/5">
            <ChevronDown size={14} className="text-ink-600 shrink-0" />
            <select
              className="bg-transparent w-full py-3 text-sm text-white focus:ring-0 focus:outline-none appearance-none"
              value={region}
              onChange={e => { setRegion(e.target.value); setCity('') }}
            >
              <option value="" className="bg-ink-900">All Regions</option>
              {REGIONS.map(r => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
            </select>
          </div>

          {tier === 'City' && (
            <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 border border-white/5">
              <ChevronDown size={14} className="text-ink-600 shrink-0" />
              <select
                className="bg-transparent w-full py-3 text-sm text-white focus:ring-0 focus:outline-none appearance-none disabled:opacity-40"
                value={city}
                onChange={e => setCity(e.target.value)}
                disabled={!region}
              >
                <option value="" className="bg-ink-900">All Cities</option>
                {cities.map(c => <option key={c} value={c} className="bg-ink-900">{c}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

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
          {/* Top 3 podium */}
          {board.length >= 3 && (
            <div className="flex items-end gap-2 mb-6 px-2">
              {/* 2nd */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-[1rem] bg-ink-700 flex items-center justify-center font-bold text-lg text-ink-300">
                  {board[1].username.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-ink-400">@{board[1].username}</p>
                  <p className="font-display font-bold text-xl text-ink-300">{board[1].wins}</p>
                </div>
                <div className="w-full h-14 bg-ink-700 rounded-t-xl flex items-center justify-center">
                  <span className="font-display font-bold text-ink-400 text-2xl">2</span>
                </div>
              </div>

              {/* 1st */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="text-2xl">👑</div>
                <div className="w-14 h-14 rounded-[1rem] bg-accent flex items-center justify-center font-bold text-xl text-ink-900">
                  {board[0].username.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-accent">@{board[0].username}</p>
                  <p className="font-display font-bold text-2xl text-accent">{board[0].wins}</p>
                </div>
                <div className="w-full h-20 bg-accent/20 border border-accent/30 rounded-t-xl flex items-center justify-center">
                  <span className="font-display font-bold text-accent text-2xl">1</span>
                </div>
              </div>

              {/* 3rd */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-[1rem] bg-ink-700 flex items-center justify-center font-bold text-lg text-orange-400">
                  {board[2].username.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-ink-400">@{board[2].username}</p>
                  <p className="font-display font-bold text-xl text-orange-400">{board[2].wins}</p>
                </div>
                <div className="w-full h-10 bg-orange-900/30 border border-orange-600/20 rounded-t-xl flex items-center justify-center">
                  <span className="font-display font-bold text-orange-500 text-xl">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Rest of board */}
          <div className="glass rounded-[1.5rem] border border-white/10 overflow-hidden">
            {board.slice(3).map((player, i) => (
              <div key={player.username} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
                <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center font-bold text-sm text-ink-500">
                  {i + 4}
                </div>
                <div className="w-9 h-9 rounded-xl bg-ink-700 flex items-center justify-center font-bold text-sm text-ink-300">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-ink-100 truncate">@{player.username}</p>
                  <p className="text-[10px] text-ink-600 font-bold">{player.city || player.region || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-lg text-accent italic">{player.wins}</p>
                  <p className="text-[9px] font-black text-ink-600 uppercase tracking-widest">Wins</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
