import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Loader2, RefreshCw, Zap, Flame, Trophy, TrendingUp } from 'lucide-react'
import ViralFeedCard from '../components/ViralFeedCard'

const ENTRIES_PER_PAGE = 12

const FEED_FILTERS = [
  { id: 'all',     label: 'All',      emoji: '⚡' },
  { id: 'viral',   label: 'Viral',    emoji: '🔥' },
  { id: 'wins',    label: 'Wins',     emoji: '🏆' },
  { id: 'upsets',  label: 'Upsets',   emoji: '😤' },
  { id: 'streaks', label: 'Streaks',  emoji: '🚀' },
]

export default function ViralFeedPage() {
  const { user } = useAuth()
  const [entries, setEntries]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(true)
  const [page, setPage]             = useState(0)
  const [filter, setFilter]         = useState('all')
  const [sport, setSport]           = useState('all')
  const lastRef                     = useRef(null)

  const ALL_SPORTS = [{ id: 'all', label: 'All', emoji: '🌐' }, ...SPORTS]

  const fetchFeed = useCallback(async (reset = true) => {
    const from = reset ? 0 : page * ENTRIES_PER_PAGE
    const to   = from + ENTRIES_PER_PAGE - 1

    let q = supabase
      .from('game_feed_entries')
      .select(`
        *,
        user:users!game_feed_entries_user_id_fkey(id, username, display_name, avatar_url, avatar_type),
        opponent_user:users!game_feed_entries_opponent_user_id_fkey(id, username, display_name, avatar_url, avatar_type),
        feed_likes(user_id)
      `)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sport !== 'all') q = q.eq('sport', sport)

    // Apply filter
    if (filter === 'viral')   q = q.or('win_streak.gte.3,is_upset.eq.true')
    if (filter === 'wins')    q = q.eq('result', 'win')
    if (filter === 'upsets')  q = q.eq('is_upset', true)
    if (filter === 'streaks') q = q.gte('win_streak', 3)

    const { data, error } = await q
    if (error) {
      console.error('ViralFeed error:', error.message)
      if (reset) setLoading(false)
      else setLoadingMore(false)
      return
    }

    if (reset) {
      setEntries(data || [])
      setPage(1)
      setLoading(false)
    } else {
      setEntries(prev => [...prev, ...(data || [])])
      setPage(prev => prev + 1)
      setLoadingMore(false)
    }
    setHasMore((data?.length || 0) === ENTRIES_PER_PAGE)
  }, [sport, filter, page])

  // Reset on filter/sport change
  useEffect(() => {
    setLoading(true)
    setPage(0)
    setEntries([])
    setHasMore(true)
    fetchFeed(true)
  }, [sport, filter]) // eslint-disable-line

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true)
          fetchFeed(false)
        }
      },
      { threshold: 0.1, rootMargin: '120px' }
    )
    if (lastRef.current) observer.observe(lastRef.current)
    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore, entries.length, sport, filter])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('viral-feed-v1')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_feed_entries' }, () => {
        fetchFeed(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_likes' }, () => {
        // targeted refresh: only re-fetch the affected entry
        fetchFeed(true)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, []) // eslint-disable-line

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
            <Zap size={20} style={{ color: '#C8FF00' }} />
            Activity
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C8FF00', opacity: 0.65 }}>
            Live · Wins · Streaks · Upsets
          </p>
        </div>
        <button
          onClick={() => fetchFeed(true)}
          className="p-2.5 rounded-xl border transition-colors hover:border-white/20"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
        {ALL_SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
            style={sport === s.id
              ? { background: '#C8FF00', borderColor: '#C8FF00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Activity filter tabs */}
      <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
        {FEED_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border shrink-0 transition-all"
            style={filter === f.id
              ? { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={28} style={{ color: '#C8FF00' }} />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">⚡</p>
          <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No activity yet
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {filter !== 'all' ? 'Try a different filter' : 'Log a match to appear here!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={entry.id} ref={idx === entries.length - 1 ? lastRef : null}>
              <ViralFeedCard entry={entry} onRefresh={() => fetchFeed(true)} />
            </div>
          ))}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" size={20} style={{ color: '#C8FF00' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
