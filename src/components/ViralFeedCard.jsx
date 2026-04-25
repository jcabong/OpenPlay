import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trophy, Flame, TrendingUp, Zap } from 'lucide-react'
import { SPORTS } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getTier, getViralBadge } from './PostGameShareCard'

// Parses "21-18, 21-15" → scoreDiff of last set
function parseScoreDiff(score) {
  if (!score) return null
  const sets = score.split(',').map(s => s.trim())
  const last  = sets[sets.length - 1]
  const m     = last?.match(/(\d+)[-–](\d+)/)
  if (!m) return null
  return Math.abs(parseInt(m[1]) - parseInt(m[2]))
}

export default function ViralFeedCard({ entry, onRefresh }) {
  const { user } = useAuth()
  const {
    id, user_id, result, score, sport,
    court_name, city, opponent_name,
    elo_before, elo_after, elo_change,
    win_streak, opponent_elo,
    user: player, opponent_user,
    feed_likes, created_at,
  } = entry

  const sportObj   = SPORTS.find(s => s.id === sport) || { emoji: '🏸', label: 'Sport' }
  const isWin      = result === 'win'
  const accentColor = isWin ? '#C8FF00' : '#FF4D00'
  const username   = player?.username || 'player'
  const hasAvatar  = player?.avatar_url && player?.avatar_type !== 'initials'
  const likesCount = feed_likes?.length || 0
  const hasLiked   = feed_likes?.some(l => l.user_id === user?.id)
  const tier       = getTier(elo_after)
  const scoreDiff  = parseScoreDiff(score)

  const viralBadge = getViralBadge({
    result,
    winStreak: win_streak,
    eloGained: elo_change,
    opponentElo: opponent_elo,
    myElo: elo_before,
    scoreDiff,
  })

  const avatarColors = ['#C8FF00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg     = avatarColors[(username?.charCodeAt(0) || 0) % avatarColors.length]

  async function toggleLike() {
    if (!user) return
    if (hasLiked) {
      await supabase.from('feed_likes').delete().eq('feed_entry_id', id).eq('user_id', user.id)
    } else {
      await supabase.from('feed_likes').insert([{ feed_entry_id: id, user_id: user.id }])
    }
    onRefresh?.()
  }

  // Build the Strava-style summary line
  const summaryText = () => {
    const oppName = opponent_user?.username || opponent_name
    const scoreStr = score ? ` ${score}` : ''
    const eloStr  = elo_change != null ? ` (${isWin ? '+' : ''}${elo_change} ELO)` : ''
    if (isWin && oppName) return `beat @${oppName}${scoreStr}${eloStr}`
    if (!isWin && oppName) return `lost to @${oppName}${scoreStr}${eloStr}`
    if (isWin) return `won a match${scoreStr}${eloStr}`
    return `played a match${scoreStr}${eloStr}`
  }

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${days}d ago`
  }

  return (
    <article
      className="rounded-[1.75rem] border overflow-hidden transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.035)',
        borderColor: isWin ? 'rgba(200,255,0,0.1)' : 'rgba(255,77,0,0.1)',
      }}
    >
      {/* Top accent */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />

      <div className="p-4">
        {/* Header row: avatar + name + time */}
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/user/${username}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
            <div className="w-9 h-9 rounded-[10px] overflow-hidden shrink-0">
              {hasAvatar ? (
                <img src={player.avatar_url} alt={username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-sm"
                  style={{ background: avatarBg, color: '#0a0a0f' }}>
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white group-hover:text-accent transition-colors truncate">
                @{username}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {timeAgo(created_at)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm">{sportObj.emoji}</span>
            {tier && (
              <div className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full"
                style={{ color: tier.color, background: tier.bg }}>
                {tier.label}
              </div>
            )}
          </div>
        </div>

        {/* Strava-style sentence */}
        <div className="mb-3">
          <p className="text-sm leading-snug">
            <span className="font-black text-white">@{username}</span>
            {' '}
            <span className="font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {summaryText()}
            </span>
          </p>
          {(court_name || city) && (
            <p className="text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              📍 {[court_name, city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Viral badge (if any) */}
        {viralBadge && (
          <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wide"
            style={{
              color: viralBadge.color,
              background: `${viralBadge.color}15`,
              border: `1px solid ${viralBadge.color}40`,
            }}>
            <span>{viralBadge.icon}</span>
            <span>{viralBadge.label}</span>
          </div>
        )}

        {/* Score + ELO visual bar */}
        <div
          className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3"
          style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}20` }}
        >
          {/* BIG W / L */}
          <div className="text-4xl font-black italic tracking-tighter leading-none shrink-0"
            style={{ color: accentColor }}>
            {isWin ? 'W' : 'L'}
          </div>

          <div className="flex-1 min-w-0">
            {score && (
              <p className="text-sm font-black text-white leading-none mb-1">{score}</p>
            )}
            <div className="flex items-center gap-2">
              {elo_after != null && (
                <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ELO {elo_after}
                </span>
              )}
              {elo_change != null && (
                <span className="text-[9px] font-black" style={{ color: isWin ? '#C8FF00' : '#FF4D00' }}>
                  {isWin ? '+' : ''}{elo_change}
                </span>
              )}
            </div>
          </div>

          {/* Opponent */}
          {(opponent_user || opponent_name) && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>vs</span>
              {opponent_user ? (
                <Link to={`/user/${opponent_user.username}`} className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg overflow-hidden">
                    {opponent_user.avatar_url && opponent_user.avatar_type !== 'initials' ? (
                      <img src={opponent_user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-black"
                        style={{ background: '#a78bfa', color: '#0a0a0f' }}>
                        {(opponent_user.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-white">@{opponent_user.username}</span>
                </Link>
              ) : (
                <span className="text-[9px] font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  @{opponent_name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Like action */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            style={{
              color: hasLiked ? '#C8FF00' : 'rgba(255,255,255,0.35)',
              background: hasLiked ? 'rgba(200,255,0,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hasLiked ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <Heart size={11} className={hasLiked ? 'fill-accent' : ''} />
            GG {likesCount > 0 && `(${likesCount})`}
          </button>

          {user?.id !== user_id && (
            <Link
              to={`/user/${username}`}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
              style={{
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              View Profile
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
