import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { notifyMentions } from '../hooks/useNotifications'
import {
  Loader2, RefreshCw, Image, Send, X, Hash, MapPin, Navigation,
  Heart, Zap, User, Trophy, Flame
} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import PostCard from '../components/PostCard'
import { useNavigate } from 'react-router-dom'

// ─── Constants ───────────────────────────────────────────────────────────────
const ALL_SPORTS     = [{ id: 'all', label: 'All', emoji: '🌐' }, ...SPORTS]
const POSTS_PER_PAGE = 10

const compressionOptions = {
  maxSizeMB:        0.5,
  maxWidthOrHeight: 1200,
  useWebWorker:     true,
  fileType:         'image/jpeg',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function compressImage(file) {
  if (file.type.startsWith('video')) return file
  if (file.size < 500 * 1024)        return file
  try { return await imageCompression(file, compressionOptions) }
  catch { return file }
}

async function fetchSinglePost(postId) {
  const { data } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey (id, username, display_name, avatar_url, avatar_type),
      likes (user_id),
      comments (
        *,
        users(id, username, display_name, avatar_url, avatar_type),
        comment_likes(user_id),
        comment_replies(*, users(id, username, display_name, avatar_url, avatar_type))
      )
    `)
    .eq('id', postId)
    .eq('is_deleted', false)
    .single()
  return data
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function getTier(elo = 1000) {
  if (elo >= 1800) return { label: 'Diamond',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  }
  if (elo >= 1500) return { label: 'Platinum', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' }
  if (elo >= 1300) return { label: 'Gold',     color: '#facc15', bg: 'rgba(250,204,21,0.15)'  }
  if (elo >= 1100) return { label: 'Silver',   color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }
  return                   { label: 'Bronze',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  }
}

function getViralBadge(entry) {
  if (entry.streak >= 5) return { icon: '🔥', label: `${entry.streak} IN A ROW`, color: '#ff4d00', bg: 'rgba(255,77,0,0.15)' }
  if (entry.streak >= 3) return { icon: '🔥', label: `${entry.streak} IN A ROW`, color: '#ff7a00', bg: 'rgba(255,122,0,0.12)' }
  if (entry.result === 'win' && entry.elo_delta > 20)  return { icon: '⚡', label: 'BIG WIN',     color: '#c8ff00', bg: 'rgba(200,255,0,0.1)'  }
  if (entry.result === 'loss' && entry.elo_delta < -20) return { icon: '💀', label: 'ROUGH ONE',  color: '#ff4d4d', bg: 'rgba(255,77,77,0.1)'  }
  return null
}

// ─── Mention-aware textarea ───────────────────────────────────────────────────
function MentionTextarea({ value, onChange, placeholder }) {
  const [results, setResults]   = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [caretPos, setCaretPos] = useState(0)
  const ref                     = useRef(null)

  async function handleChange(e) {
    const val = e.target.value
    const pos = e.target.selectionStart
    setCaretPos(pos)
    onChange(val)
    const match = val.slice(0, pos).match(/@(\w*)$/)
    if (match && match[1].length >= 1) {
      const { data } = await supabase
        .from('users').select('id, username').ilike('username', `${match[1]}%`).limit(5)
      setResults(data || [])
      setShowDrop(true)
    } else {
      setShowDrop(false)
      setResults([])
    }
  }

  function pickUser(username) {
    const before = value.slice(0, caretPos).replace(/@\w*$/, `@${username} `)
    const after  = value.slice(caretPos)
    onChange(before + after)
    setShowDrop(false)
    setResults([])
    setTimeout(() => ref.current?.focus(), 0)
  }

  return (
    <div className="relative">
      <textarea
        ref={ref} value={value} onChange={handleChange} autoFocus
        onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false) }}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-sm leading-relaxed"
        style={{ color: '#ffffff', caretColor: '#c8ff00', minHeight: '80px' }}
        placeholder={placeholder}
      />
      {showDrop && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-full bg-ink-700 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map(u => (
            <button key={u.id} type="button" onMouseDown={() => pickUser(u.username)}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-accent hover:bg-white/5 border-b border-white/5 last:border-none">
              @{u.username}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Game Feed Card (ViralFeed style) ────────────────────────────────────────
function GameFeedCard({ entry, currentUserId }) {
  const navigate  = useNavigate()
  const [liked, setLiked]       = useState(entry.liked_by_me || false)
  const [likeCount, setLikeCount] = useState(entry.like_count || 0)
  const [liking, setLiking]     = useState(false)

  const isWin    = entry.result === 'win'
  const sport    = SPORTS.find(s => s.id === entry.sport)
  const tier     = getTier(entry.elo_after ?? entry.user_elo ?? 1000)
  const badge    = getViralBadge(entry)
  const eloDelta = entry.elo_delta ?? 0
  const opponent = entry.opponent_username || entry.opponent_name || null

  // Color bar: green-yellow for win, orange-red for loss
  const barColor = isWin
    ? 'linear-gradient(90deg, #c8ff00, #39ff14)'
    : 'linear-gradient(90deg, #ff4d00, #ff0040)'

  async function toggleLike() {
    if (!currentUserId || liking) return
    setLiking(true)
    if (liked) {
      await supabase.from('feed_likes')
        .delete()
        .eq('entry_id', entry.id)
        .eq('user_id', currentUserId)
      setLiked(false)
      setLikeCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('feed_likes')
        .insert([{ entry_id: entry.id, user_id: currentUserId }])
      setLiked(true)
      setLikeCount(c => c + 1)
    }
    setLiking(false)
  }

  const hasAvatar = entry.avatar_url && entry.avatar_type !== 'initials'
  const avatarColors = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg = avatarColors[((entry.username || '').charCodeAt(0) || 0) % avatarColors.length]

  return (
    <div className="rounded-[1.5rem] overflow-hidden border border-white/8"
      style={{ background: 'rgba(255,255,255,0.04)' }}>

      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: barColor }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <button
              onClick={() => navigate(`/user/${entry.username}`)}
              className="w-10 h-10 rounded-[0.75rem] overflow-hidden shrink-0 flex-shrink-0">
              {hasAvatar ? (
                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm"
                  style={{ background: avatarBg, color: '#0a0a0f' }}>
                  {(entry.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
            <div>
              <button
                onClick={() => navigate(`/user/${entry.username}`)}
                className="font-black text-sm text-white hover:text-[#c8ff00] transition-colors leading-none">
                @{entry.username}
              </button>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {timeAgo(entry.played_at || entry.created_at)}
              </p>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase"
            style={{ background: tier.bg, borderColor: tier.color + '40', color: tier.color }}>
            <Trophy size={10} />
            {tier.label}
          </div>
        </div>

        {/* Headline */}
        <p className="text-sm font-bold mb-1.5 leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <span style={{ color: '#c8ff00' }}>@{entry.username}</span>
          {' '}{isWin ? 'beat' : 'lost to'}{' '}
          {opponent ? (
            <span style={{ color: isWin ? '#c8ff00' : '#ff6b6b' }}>
              @{opponent}
            </span>
          ) : 'someone'}
          {' '}{entry.score}
          {eloDelta !== 0 && (
            <span className="text-[11px] font-black ml-1"
              style={{ color: eloDelta > 0 ? '#c8ff00' : '#ff6b6b' }}>
              ({eloDelta > 0 ? '+' : ''}{eloDelta} ELO)
            </span>
          )}
        </p>

        {/* Location */}
        {(entry.court_name || entry.city) && (
          <p className="text-[10px] font-bold mb-3 flex items-center gap-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <MapPin size={9} style={{ color: '#c8ff00' }} />
            {[entry.court_name, entry.city].filter(Boolean).join(' · ').toUpperCase()}
          </p>
        )}

        {/* Score card */}
        <div className="rounded-2xl border p-3.5 mb-3 flex items-center justify-between"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            {/* W/L letter */}
            <span className="font-black italic text-4xl leading-none"
              style={{ color: isWin ? '#c8ff00' : '#ff4d00', fontFamily: '"Clash Display", system-ui' }}>
              {isWin ? 'W' : 'L'}
            </span>
            <div>
              <p className="font-black text-white text-lg leading-none">{entry.score || '—'}</p>
              {entry.elo_after != null && (
                <p className="text-[10px] font-black mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ELO {entry.elo_after}
                  {eloDelta !== 0 && (
                    <span className="ml-1.5" style={{ color: eloDelta > 0 ? '#c8ff00' : '#ff6b6b' }}>
                      {eloDelta > 0 ? '+' : ''}{eloDelta}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Opponent */}
          {opponent && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>VS</span>
              <button
                onClick={() => navigate(`/user/${opponent}`)}
                className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {entry.opponent_avatar ? (
                    <img src={entry.opponent_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black"
                      style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {opponent.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  @{opponent}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Viral badge */}
        {badge && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border w-fit"
            style={{ background: badge.bg, borderColor: badge.color + '40' }}>
            <span className="text-sm">{badge.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: badge.color }}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Sport chip */}
        {sport && (
          <div className="mb-3">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              {sport.emoji} {sport.label}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            onClick={toggleLike}
            disabled={liking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[11px] font-black uppercase transition-all"
            style={liked
              ? { background: 'rgba(200,255,0,0.1)', borderColor: 'rgba(200,255,0,0.3)', color: '#c8ff00' }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
            }>
            <Heart size={13} className={liked ? 'fill-[#c8ff00]' : ''} />
            GG {likeCount > 0 && `(${likeCount})`}
          </button>

          <button
            onClick={() => navigate(`/user/${entry.username}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[11px] font-black uppercase transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            <User size={13} />
            View Profile
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main FeedPage ────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, profile } = useAuth()

  // Tab: 'posts' | 'games'
  const [activeTab, setActiveTab] = useState('games')

  // ── Posts feed state ───────────────────────────────────────────────────────
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(true)
  const [sport, setSport]             = useState('all')
  const [refreshing, setRefreshing]   = useState(false)
  const pageRef                       = useRef(0)
  const lastPostRef                   = useRef(null)

  // ── Composer state ─────────────────────────────────────────────────────────
  const [content, setContent]                     = useState('')
  const [taggedSport, setTaggedSport]             = useState(null)
  const [mediaFiles, setMediaFiles]               = useState([])
  const [mediaPreviews, setMediaPreviews]         = useState([])
  const [posting, setPosting]                     = useState(false)
  const [composerOpen, setComposerOpen]           = useState(false)
  const [showSportPicker, setShowSportPicker]     = useState(false)
  const [locationName, setLocationName]           = useState('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [gpsLoading, setGpsLoading]               = useState(false)
  const fileInputRef                              = useRef(null)

  // ── Game feed state ────────────────────────────────────────────────────────
  const [gameEntries, setGameEntries]     = useState([])
  const [gameLoading, setGameLoading]     = useState(true)
  const [gameSport, setGameSport]         = useState('all')
  const [startY, setStartY]               = useState(0)
  const feedContainerRef                  = useRef(null)

  // ─── Posts feed fetch ───────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (isReset = true) => {
    if (isReset) {
      setLoading(true)
      pageRef.current = 0
      setPosts([])
      setHasMore(true)
    }

    const from = pageRef.current * POSTS_PER_PAGE
    const to   = from + POSTS_PER_PAGE - 1

    let q = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (id, username, display_name, avatar_url, avatar_type),
        likes (user_id),
        comments (
          *,
          users(id, username, display_name, avatar_url, avatar_type),
          comment_likes(user_id),
          comment_replies(*, users(id, username, display_name, avatar_url, avatar_type))
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sport !== 'all') q = q.eq('sport', sport)

    const { data, error } = await q
    if (error) { console.error('Feed error:', error.message); setLoading(false); setLoadingMore(false); return }

    if (isReset) { setPosts(data || []); setLoading(false) }
    else         { setPosts(prev => [...prev, ...(data || [])]); setLoadingMore(false) }

    const hasMorePages = (data?.length || 0) === POSTS_PER_PAGE
    setHasMore(hasMorePages)
    if (hasMorePages) pageRef.current += 1
  }, [sport])

  const refreshSinglePost = useCallback(async (postId) => {
    const updated = await fetchSinglePost(postId)
    if (!updated) { setPosts(prev => prev.filter(p => p.id !== postId)); return }
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === postId)
      if (idx === -1) return prev
      const next = [...prev]; next[idx] = updated; return next
    })
  }, [])

  // ─── Game feed fetch ────────────────────────────────────────────────────────
  const fetchGameFeed = useCallback(async () => {
    setGameLoading(true)
    try {
      // Pull games joined with user info + elo_history for delta
      let q = supabase
        .from('games')
        .select(`
          id, sport, result, score, court_name, city, province,
          opponent_name, tagged_opponent_id, created_at,
          user:users!games_user_id_fkey (
            id, username, display_name, avatar_url, avatar_type, elo_rating, skill_tier
          ),
          opponent:users!games_tagged_opponent_id_fkey (
            id, username, display_name, avatar_url, avatar_type, elo_rating
          )
        `)
        .eq('is_deleted', false)
        .not('tagged_opponent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (gameSport !== 'all') q = q.eq('sport', gameSport)

      const { data: games, error } = await q
      if (error) throw error

      // Fetch ELO history for delta values
      const gameIds = (games || []).map(g => g.id)
      let eloMap = {}
      if (gameIds.length) {
        const { data: eloRows } = await supabase
          .from('elo_history')
          .select('game_id, user_id, rating_before, rating_after, rating_delta')
          .in('game_id', gameIds)
        ;(eloRows || []).forEach(row => {
          eloMap[`${row.game_id}_${row.user_id}`] = row
        })
      }

      // Calculate streaks per user
      const streakMap = {}
      const sortedGames = [...(games || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      sortedGames.forEach(g => {
        const uid = g.user?.id
        if (!uid) return
        if (!streakMap[uid]) streakMap[uid] = { streak: 0, lastResult: null }
        if (g.result === 'win') {
          streakMap[uid].streak = streakMap[uid].lastResult === 'win' ? streakMap[uid].streak + 1 : 1
        } else {
          streakMap[uid].streak = 0
        }
        streakMap[uid].lastResult = g.result
      })

      // Fetch like counts for these games (from feed_likes if table exists, else skip)
      let likesMap = {}
      let myLikesSet = new Set()
      try {
        const { data: likeRows } = await supabase
          .from('feed_likes')
          .select('entry_id, user_id')
          .in('entry_id', gameIds)
        ;(likeRows || []).forEach(row => {
          likesMap[row.entry_id] = (likesMap[row.entry_id] || 0) + 1
          if (row.user_id === user?.id) myLikesSet.add(row.entry_id)
        })
      } catch (_) {
        // feed_likes table may not exist yet — silently skip
      }

      // Build enriched entries
      const entries = (games || []).map(g => {
        const uid     = g.user?.id
        const eloRow  = eloMap[`${g.id}_${uid}`]
        const userStreak = streakMap[uid] || { streak: 0 }

        return {
          id:               g.id,
          result:           g.result,
          score:            g.score,
          sport:            g.sport,
          court_name:       g.court_name,
          city:             g.city,
          played_at:        g.created_at,
          // user info
          username:         g.user?.username || '—',
          avatar_url:       g.user?.avatar_url,
          avatar_type:      g.user?.avatar_type,
          user_elo:         g.user?.elo_rating,
          // elo delta from history
          elo_before:       eloRow?.rating_before ?? null,
          elo_after:        eloRow?.rating_after  ?? g.user?.elo_rating ?? null,
          elo_delta:        eloRow?.rating_delta  ?? 0,
          // opponent info
          opponent_username: g.opponent?.username || null,
          opponent_name:     g.opponent_name || null,
          opponent_avatar:   g.opponent?.avatar_url || null,
          // viral
          streak:           userStreak.streak,
          like_count:       likesMap[g.id] || 0,
          liked_by_me:      myLikesSet.has(g.id),
        }
      })

      setGameEntries(entries)
    } catch (err) {
      console.error('fetchGameFeed error:', err)
    } finally {
      setGameLoading(false)
    }
  }, [gameSport, user?.id])

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchFeed(true) }, [sport])
  useEffect(() => { fetchGameFeed()  }, [gameSport])

  // Infinite scroll for posts
  useEffect(() => {
    if (loading || loadingMore || !hasMore || activeTab !== 'posts') return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) { setLoadingMore(true); fetchFeed(false) } },
      { threshold: 0.1, rootMargin: '100px' }
    )
    if (lastPostRef.current) observer.observe(lastPostRef.current)
    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore, posts.length, fetchFeed, activeTab])

  // Realtime for posts
  useEffect(() => {
    const channel = supabase
      .channel('feed-unified-v1')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchFeed(true))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' },
        payload => setPosts(prev => prev.filter(p => p.id !== payload.old?.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' },
        payload => { if (payload.new?.post_id) refreshSinglePost(payload.new.post_id) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' },
        payload => { if (payload.old?.post_id) refreshSinglePost(payload.old.post_id) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' },
        payload => { if (payload.new?.post_id) refreshSinglePost(payload.new.post_id) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' },
        payload => { if (payload.old?.post_id) refreshSinglePost(payload.old.post_id) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games' }, fetchGameFeed)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchFeed, refreshSinglePost, fetchGameFeed])

  // Pull to refresh
  const handleTouchStart = e => { if (window.scrollY === 0 && !refreshing) setStartY(e.touches[0].clientY) }
  const handleTouchMove  = e => {
    if (window.scrollY === 0 && !refreshing && startY > 0 && e.touches[0].clientY - startY > 60) {
      setRefreshing(true)
      const refresh = activeTab === 'posts' ? fetchFeed(true) : fetchGameFeed()
      Promise.resolve(refresh).then(() => setRefreshing(false))
    }
  }
  const handleTouchEnd = () => setStartY(0)

  // ─── Composer helpers ───────────────────────────────────────────────────────
  function handleMediaSelect(e) {
    const files = Array.from(e.target.files)
    setMediaFiles(prev    => [...prev, ...files].slice(0, 4))
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setMediaPreviews(prev => [...prev, { url, type: file.type.startsWith('video') ? 'video' : 'image' }].slice(0, 4))
    })
  }
  function removeMedia(index) {
    setMediaFiles(prev    => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }
  function resetComposer() {
    setContent(''); setTaggedSport(null); setMediaFiles([]); setMediaPreviews([])
    setComposerOpen(false); setShowSportPicker(false); setLocationName(''); setShowLocationInput(false)
  }

  async function detectLocation() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
          const data = await res.json()
          setLocationName(data.address?.suburb || data.address?.city_district || data.address?.city || data.display_name || '')
          setShowLocationInput(true)
        } catch { alert('Could not get location name') }
        finally  { setGpsLoading(false) }
      },
      () => { setGpsLoading(false); alert('Location access denied') }
    )
  }

  async function uploadMedia() {
    const urls = [], types = []
    for (const file of mediaFiles) {
      const fileToUpload = await compressImage(file)
      const ext  = fileToUpload.type.startsWith('video') ? 'mp4' : 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('openplay-media').upload(path, fileToUpload)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
        urls.push(publicUrl); types.push(fileToUpload.type.startsWith('video') ? 'video' : 'image')
      }
    }
    return { urls, types }
  }

  async function handlePost() {
    if (!user || (!content.trim() && mediaFiles.length === 0)) return
    setPosting(true)
    try {
      const { urls: media_urls, types: media_types } = mediaFiles.length ? await uploadMedia() : { urls: [], types: [] }
      const now = new Date().toISOString()
      const { data: newPost, error } = await supabase.from('posts').insert([{
        author_id: user.id, user_id: user.id, content: content.trim(),
        sport: taggedSport || null, media_urls, media_types,
        location_name: locationName.trim() || null, created_at: now, inserted_at: now,
      }]).select().single()
      if (error) throw error
      if (content.includes('@') && newPost) {
        await notifyMentions({ text: content.trim(), fromUser: { id: user.id, username }, postId: newPost.id })
      }
      resetComposer()
    } catch (err) {
      alert('Failed to post: ' + err.message)
    } finally {
      setPosting(false)
    }
  }

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const username       = profile?.username || user?.email?.split('@')[0] || 'You'
  const initial        = username.charAt(0).toUpperCase()
  const hasAvatar      = profile?.avatar_url && profile?.avatar_type !== 'initials'
  const avatarColors   = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg       = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]
  const taggedSportObj = SPORTS.find(s => s.id === taggedSport)

  return (
    <div className="min-h-screen" ref={feedContainerRef}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>Feed</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.7 }}>Real-time · OpenPlay</p>
        </div>
        <button
          onClick={() => { if (activeTab === 'posts') fetchFeed(true); else fetchGameFeed() }}
          className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1.5 mb-4 p-1 rounded-2xl border border-white/8"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setActiveTab('games')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          style={activeTab === 'games'
            ? { background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
            : { color: 'rgba(255,255,255,0.45)' }
          }>
          <Zap size={13} /> Game Feed
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          style={activeTab === 'posts'
            ? { background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
            : { color: 'rgba(255,255,255,0.45)' }
          }>
          <Flame size={13} /> Posts
        </button>
      </div>

      {refreshing && (
        <div className="flex justify-center items-center py-3 mb-2 gap-2">
          <Loader2 className="animate-spin" size={18} style={{ color: '#c8ff00' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Refreshing...</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GAME FEED TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'games' && (
        <>
          {/* Sport filter */}
          <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
            {ALL_SPORTS.map(s => (
              <button key={s.id} onClick={() => setGameSport(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
                style={gameSport === s.id
                  ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
                }>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {gameLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={28} style={{ color: '#c8ff00' }} />
            </div>
          ) : gameEntries.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-5xl mb-3">⚡</p>
              <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>No games yet</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Log a match with a tagged opponent to appear here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gameEntries.map(entry => (
                <GameFeedCard key={entry.id} entry={entry} currentUserId={user?.id} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          POSTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'posts' && (
        <>
          {/* Sport filter */}
          <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
            {ALL_SPORTS.map(s => (
              <button key={s.id} onClick={() => setSport(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
                style={sport === s.id
                  ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }
                }>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {/* Composer */}
          {user && (
            <div className="mb-5">
              {!composerOpen ? (
                <button onClick={() => setComposerOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left hover:border-white/20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0">
                    {hasAvatar ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center font-black text-sm" style={{ background: avatarBg, color: '#0a0a0f' }}>{initial}</div>}
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>What's happening on court?</span>
                </button>
              ) : (
                <div className="rounded-3xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0">
                      {hasAvatar ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center font-black text-sm" style={{ background: avatarBg, color: '#0a0a0f' }}>{initial}</div>}
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: '#ffffff' }}>@{username}</p>
                      {taggedSportObj ? (
                        <button onClick={() => setTaggedSport(null)} className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg mt-0.5"
                          style={{ background: 'rgba(200,255,0,0.12)', color: '#c8ff00' }}>
                          {taggedSportObj.emoji} {taggedSportObj.label} <X size={9} className="ml-1" />
                        </button>
                      ) : <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>General post</p>}
                    </div>
                  </div>

                  <div className="px-4 py-2">
                    <MentionTextarea value={content} onChange={setContent} placeholder="What's on your mind? Use @mentions…" />
                  </div>

                  {mediaPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 px-4 pb-3">
                      {mediaPreviews.map((m, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                          {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                          <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showLocationInput && (
                    <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border"
                      style={{ background: 'rgba(200,255,0,0.05)', borderColor: 'rgba(200,255,0,0.2)' }}>
                      <MapPin size={13} style={{ color: '#c8ff00' }} className="shrink-0" />
                      <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Court or location name…"
                        className="flex-1 bg-transparent text-xs outline-none" style={{ color: '#ffffff' }} />
                      <button onClick={() => { setLocationName(''); setShowLocationInput(false) }}>
                        <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </div>
                  )}

                  {showSportPicker && (
                    <div className="mx-4 mb-3 rounded-2xl border overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Tag a sport (optional)</p>
                      </div>
                      <div className="flex flex-wrap gap-2 p-3">
                        {SPORTS.map(s => (
                          <button key={s.id} onClick={() => { setTaggedSport(s.id === taggedSport ? null : s.id); setShowSportPicker(false) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
                            style={taggedSport === s.id
                              ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f' }
                              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                            }>
                            {s.emoji} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        <Image size={18} />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
                      <button onClick={() => setShowSportPicker(!showSportPicker)} className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                        style={{ color: taggedSport ? '#c8ff00' : 'rgba(255,255,255,0.45)' }}>
                        <Hash size={18} />
                      </button>
                      <button onClick={() => showLocationInput ? setShowLocationInput(false) : detectLocation()}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors" disabled={gpsLoading}
                        style={{ color: locationName ? '#c8ff00' : 'rgba(255,255,255,0.45)' }}>
                        {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                      </button>
                      <button onClick={resetComposer} className="px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors ml-1"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                    </div>
                    <button onClick={handlePost} disabled={posting || (!content.trim() && mediaFiles.length === 0)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-40 active:scale-95"
                      style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }}>
                      {posting ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Post</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Posts list */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin" size={28} style={{ color: '#c8ff00' }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="text-5xl mb-4">🏸</p>
              <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>No posts yet</p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null}>
                  <PostCard post={post} onRefresh={() => refreshSinglePost(post.id)} />
                </div>
              ))}
              {loadingMore && (
                <div className="flex justify-center items-center py-4 gap-2">
                  <Loader2 className="animate-spin" size={20} style={{ color: '#c8ff00' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading more...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
