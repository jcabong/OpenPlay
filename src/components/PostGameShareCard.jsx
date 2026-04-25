import { useRef, useState, useEffect } from 'react'
import { X, Download, Share2, Twitter, Facebook, Copy, Check, Flame, Zap, Trophy, TrendingUp } from 'lucide-react'
import { SPORTS } from '../lib/supabase'

// ── Tier system ──────────────────────────────────────────────────────────────
export function getTier(elo) {
  if (!elo) return null
  if (elo >= 1800) return { label: 'Legend',   color: '#FF4D00', bg: 'rgba(255,77,0,0.18)',     glow: '0 0 20px rgba(255,77,0,0.4)'      }
  if (elo >= 1600) return { label: 'Diamond',  color: '#60a5fa', bg: 'rgba(96,165,250,0.18)',   glow: '0 0 20px rgba(96,165,250,0.4)'    }
  if (elo >= 1400) return { label: 'Platinum', color: '#a78bfa', bg: 'rgba(167,139,250,0.18)',  glow: '0 0 20px rgba(167,139,250,0.4)'   }
  if (elo >= 1200) return { label: 'Gold',     color: '#C8FF00', bg: 'rgba(200,255,0,0.15)',    glow: '0 0 20px rgba(200,255,0,0.4)'     }
  if (elo >= 1000) return { label: 'Silver',   color: '#9ca3af', bg: 'rgba(156,163,175,0.15)',  glow: '0 0 20px rgba(156,163,175,0.3)'   }
  return                   { label: 'Bronze',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   glow: '0 0 20px rgba(245,158,11,0.3)'    }
}

// ── Viral badge detector ─────────────────────────────────────────────────────
export function getViralBadge({ result, winStreak, eloGained, opponentElo, myElo, scoreDiff }) {
  if (result !== 'win') return null
  if (winStreak >= 5)   return { icon: '🔥', label: `${winStreak} Win Streak`, color: '#FF4D00', type: 'streak' }
  if (winStreak >= 3)   return { icon: '⚡', label: `${winStreak} Game Streak`, color: '#f59e0b', type: 'streak' }
  if (opponentElo && myElo && opponentElo > myElo + 150)
                        return { icon: '😤', label: 'UPSET WIN',  color: '#a78bfa', type: 'upset'  }
  if (scoreDiff !== null && scoreDiff !== undefined && scoreDiff <= 3)
                        return { icon: '😰', label: 'Close Call', color: '#60a5fa', type: 'close'  }
  if (eloGained >= 30)  return { icon: '🚀', label: `+${eloGained} ELO`,        color: '#C8FF00', type: 'elo'    }
  return null
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, avatarType, username, size = 40, radius = 12 }) {
  const initial = (username || '?').charAt(0).toUpperCase()
  const colors  = ['#C8FF00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const bg      = colors[(username?.charCodeAt(0) || 0) % colors.length]

  if (url && avatarType !== 'initials') {
    return (
      <img src={url} alt={username} crossOrigin="anonymous"
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, color: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// ── CARD VARIANT: CLEAN (default) ────────────────────────────────────────────
function CleanCard({ data, cardRef }) {
  const {
    result, score, sport,
    myProfile, opponentProfile, opponentName,
    eloGained, eloCurrent, winRate, totalWins, totalGames,
    courtName, city, winStreak,
  } = data

  const sportObj     = SPORTS.find(s => s.id === sport) || { emoji: '🏸', label: 'Racket' }
  const isWin        = result === 'win'
  const tier         = getTier(eloCurrent)
  const scoreDisplay = score || (isWin ? 'WIN' : 'LOSS')
  const myUsername   = myProfile?.username || 'Player'
  const oppUsername  = opponentProfile?.username || opponentName || 'Opponent'

  // Parse score diff for viral badge
  let scoreDiff = null
  if (score) {
    const parts = score.match(/(\d+)[-–](\d+)/)
    if (parts) scoreDiff = Math.abs(parseInt(parts[1]) - parseInt(parts[2]))
  }
  const viralBadge = getViralBadge({
    result, winStreak, eloGained,
    opponentElo: opponentProfile?.elo_rating,
    myElo: eloCurrent, scoreDiff,
  })

  const accentColor = isWin ? '#C8FF00' : '#FF4D00'

  return (
    <div ref={cardRef} style={{
      width: 320, background: '#0a0a0f',
      borderRadius: 20, overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      border: `1px solid ${isWin ? 'rgba(200,255,0,0.15)' : 'rgba(255,77,0,0.15)'}`,
      position: 'relative',
      boxShadow: isWin ? '0 0 40px rgba(200,255,0,0.08)' : '0 0 40px rgba(255,77,0,0.08)',
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />

      <div style={{ padding: '18px 18px 14px' }}>
        {/* Top row: sport + viral badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 9, fontWeight: 800, color: '#C8FF00',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {sportObj.emoji} {sportObj.label}
          </div>
          {viralBadge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: `${viralBadge.color}18`,
              border: `1px solid ${viralBadge.color}50`,
              borderRadius: 20, padding: '3px 8px',
              fontSize: 8, fontWeight: 900, color: viralBadge.color,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {viralBadge.icon} {viralBadge.label}
            </div>
          )}
        </div>

        {/* BIG result text */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: accentColor, marginBottom: 2,
          }}>
            {isWin ? '🏆 Victory' : '😤 Defeat'}
          </div>
          <div style={{
            fontSize: 48, fontWeight: 900, color: '#ffffff',
            lineHeight: 1, letterSpacing: '-2px',
            textShadow: `0 0 30px ${accentColor}40`,
          }}>
            {scoreDisplay}
          </div>
          {(courtName || city) && (
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              📍 {[courtName, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

        {/* My player */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar url={myProfile?.avatar_url} avatarType={myProfile?.avatar_type} username={myUsername} size={38} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{myUsername}
            </div>
            {eloCurrent && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                ELO {eloCurrent}
                {eloGained != null && (
                  <span style={{ color: isWin ? '#C8FF00' : '#FF4D00', marginLeft: 4 }}>
                    {isWin ? '+' : ''}{eloGained}
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 900,
            color: accentColor, background: `${accentColor}18`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 20, padding: '3px 8px',
            textTransform: 'uppercase',
          }}>
            {isWin ? 'WIN' : 'LOSS'}
          </div>
        </div>

        {/* VS */}
        {(opponentProfile || opponentName) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>VS</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}

        {/* Opponent */}
        {(opponentProfile || opponentName) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Avatar url={opponentProfile?.avatar_url} avatarType={opponentProfile?.avatar_type} username={oppUsername} size={38} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{oppUsername}
              </div>
              {opponentProfile?.elo_rating && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  ELO {opponentProfile.elo_rating}
                </div>
              )}
            </div>
            {!isWin && (
              <div style={{
                fontSize: 9, fontWeight: 900, color: '#C8FF00',
                background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.25)',
                borderRadius: 20, padding: '3px 8px', textTransform: 'uppercase',
              }}>WIN</div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
          {[
            { label: 'Win Rate', val: winRate ? `${winRate}%` : '—', accent: false },
            { label: 'Total Wins', val: totalWins ?? '—', accent: true },
            { label: 'Matches',   val: totalGames ?? '—', accent: false },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '8px 6px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.accent ? accentColor : '#fff', lineHeight: 1, marginBottom: 3 }}>
                {s.val}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Open<span style={{ color: '#C8FF00' }}>Play</span>
          </div>
          {tier && (
            <div style={{
              fontSize: 8, fontWeight: 800, color: tier.color,
              background: tier.bg, border: `1px solid ${tier.color}40`,
              borderRadius: 20, padding: '2px 8px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {tier.label} Tier
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CARD VARIANT: FLEX (win streak) ──────────────────────────────────────────
function FlexCard({ data, cardRef }) {
  const { result, score, sport, myProfile, opponentProfile, opponentName,
    eloGained, eloCurrent, winStreak, totalWins } = data

  const sportObj   = SPORTS.find(s => s.id === sport) || { emoji: '🏸', label: 'Racket' }
  const isWin      = result === 'win'
  const myUsername = myProfile?.username || 'Player'
  const oppUsername = opponentProfile?.username || opponentName || 'Opponent'
  const streakCount = winStreak || 0

  return (
    <div ref={cardRef} style={{
      width: 320, background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a00 100%)',
      borderRadius: 20, overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      border: '1px solid rgba(255,77,0,0.3)',
      position: 'relative',
      boxShadow: '0 0 60px rgba(255,77,0,0.15)',
    }}>
      {/* Fire animated bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #FF4D00, #f59e0b, #FF4D00)', backgroundSize: '200% 100%' }} />

      <div style={{ padding: '18px 18px 14px' }}>
        {/* Streak banner */}
        <div style={{
          background: 'rgba(255,77,0,0.12)', border: '1px solid rgba(255,77,0,0.3)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 28 }}>🔥</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FF4D00', lineHeight: 1 }}>
              {streakCount} WIN STREAK
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              On Fire · {sportObj.emoji} {sportObj.label}
            </div>
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
            {score || 'WIN'}
          </div>
          <div style={{ fontSize: 10, color: '#FF4D00', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
            vs @{oppUsername}
          </div>
        </div>

        {/* ELO gain */}
        {eloGained != null && (
          <div style={{
            textAlign: 'center', marginBottom: 14,
            background: 'rgba(200,255,0,0.08)', borderRadius: 12,
            padding: '8px 0', border: '1px solid rgba(200,255,0,0.15)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#C8FF00' }}>+{eloGained}</span>
            <span style={{ fontSize: 10, color: 'rgba(200,255,0,0.6)', marginLeft: 4, fontWeight: 700 }}>ELO</span>
          </div>
        )}

        {/* Player row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar url={myProfile?.avatar_url} avatarType={myProfile?.avatar_type} username={myUsername} size={34} radius={10} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>@{myUsername}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{totalWins} career wins</div>
          </div>
          <div style={{
            fontSize: 8, fontWeight: 900, color: '#FF4D00',
            background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.3)',
            borderRadius: 20, padding: '3px 8px', textTransform: 'uppercase',
          }}>🔥 STREAK</div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            Open<span style={{ color: '#C8FF00' }}>Play</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>openplaygg.vercel.app</div>
        </div>
      </div>
    </div>
  )
}

// ── CARD VARIANT: UPSET ───────────────────────────────────────────────────────
function UpsetCard({ data, cardRef }) {
  const { result, score, sport, myProfile, opponentProfile, opponentName,
    eloGained, eloCurrent } = data

  const sportObj     = SPORTS.find(s => s.id === sport) || { emoji: '🏸', label: 'Racket' }
  const myUsername   = myProfile?.username || 'Player'
  const oppUsername  = opponentProfile?.username || opponentName || 'Opponent'
  const eloGap       = opponentProfile?.elo_rating && eloCurrent
    ? opponentProfile.elo_rating - eloCurrent : null

  return (
    <div ref={cardRef} style={{
      width: 320, background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 100%)',
      borderRadius: 20, overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      border: '1px solid rgba(167,139,250,0.3)',
      boxShadow: '0 0 60px rgba(167,139,250,0.12)',
    }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }} />

      <div style={{ padding: '18px 18px 14px' }}>
        {/* UPSET banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(96,165,250,0.1))',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            {sportObj.emoji} {sportObj.label} · Upset Victory
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#a78bfa', lineHeight: 1, letterSpacing: '-1px' }}>
            😤 UPSET WIN
          </div>
          {eloGap && eloGap > 0 && (
            <div style={{ fontSize: 9, color: 'rgba(167,139,250,0.7)', marginTop: 4 }}>
              Beat a player {eloGap} ELO higher
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px', textShadow: '0 0 30px rgba(167,139,250,0.4)' }}>
            {score || 'WIN'}
          </div>
        </div>

        {/* Players comparison */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Avatar url={myProfile?.avatar_url} avatarType={myProfile?.avatar_type} username={myUsername} size={44} radius={12} />
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginTop: 6 }}>@{myUsername}</div>
            <div style={{ fontSize: 8, color: '#a78bfa', fontWeight: 800 }}>ELO {eloCurrent || '—'}</div>
            <div style={{ marginTop: 4, fontSize: 8, color: '#C8FF00', background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', fontWeight: 900 }}>
              UNDERDOG
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>VS</div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <Avatar url={opponentProfile?.avatar_url} avatarType={opponentProfile?.avatar_type} username={oppUsername} size={44} radius={12} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>@{oppUsername}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>ELO {opponentProfile?.elo_rating || '—'}</div>
            <div style={{ marginTop: 4, fontSize: 8, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, padding: '2px 8px', display: 'inline-block', fontWeight: 900 }}>
              FAVORITE
            </div>
          </div>
        </div>

        {eloGained != null && (
          <div style={{
            textAlign: 'center', marginBottom: 14,
            background: 'rgba(200,255,0,0.08)', borderRadius: 12,
            padding: '8px 0', border: '1px solid rgba(200,255,0,0.15)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#C8FF00' }}>+{eloGained}</span>
            <span style={{ fontSize: 10, color: 'rgba(200,255,0,0.6)', marginLeft: 4, fontWeight: 700 }}>ELO Gained</span>
          </div>
        )}

        {/* Footer */}
        <div style={{
          paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            Open<span style={{ color: '#C8FF00' }}>Play</span>
          </div>
          <div style={{ fontSize: 8, color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Upset King 👑
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Auto-detect best card variant ─────────────────────────────────────────────
function autoSelectVariant(data) {
  const { result, winStreak, opponentProfile, eloCurrent } = data
  if (result !== 'win') return 'clean'
  if ((winStreak || 0) >= 3) return 'flex'
  if (opponentProfile?.elo_rating && eloCurrent && opponentProfile.elo_rating > eloCurrent + 150) return 'upset'
  return 'clean'
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PostGameShareCard({ data, onClose }) {
  const cardRef   = useRef(null)
  const [variant, setVariant]           = useState(() => autoSelectVariant(data))
  const [copied, setCopied]             = useState(false)
  const [capturing, setCapturing]       = useState(false)
  const [html2canvasReady, setHtml2canvasReady] = useState(false)

  // Lazy-load html2canvas
  useEffect(() => {
    if (window.html2canvas) { setHtml2canvasReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => setHtml2canvasReady(true)
    document.head.appendChild(s)
  }, [])

  async function downloadCard() {
    if (!cardRef.current || !html2canvasReady) return alert('Card renderer not ready yet, please wait.')
    setCapturing(true)
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll('img').forEach(img => { img.crossOrigin = 'anonymous' })
        },
      })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `openplay-${data.result}-${Date.now()}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('html2canvas error', e)
      alert('Could not capture card. Try again.')
    } finally {
      setCapturing(false)
    }
  }

  async function nativeShare() {
    if (!cardRef.current || !html2canvasReady) return
    setCapturing(true)
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f', scale: 2, useCORS: true,
      })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const file = new File([blob], 'openplay-result.png', { type: 'image/png' })
      const sportObj = SPORTS.find(s => s.id === data.sport) || { emoji: '🏸', label: 'match' }
      const text = data.result === 'win'
        ? `🏆 Beat @${data.opponentProfile?.username || data.opponentName || 'opponent'} ${data.score || ''} in ${sportObj.label} on OpenPlay!`
        : `Took the L ${data.score || ''} today in ${sportObj.emoji} ${sportObj.label}. Rematching soon! #OpenPlay`

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'OpenPlay Match Result', text })
      } else if (navigator.share) {
        await navigator.share({ title: 'OpenPlay Match Result', text, url: window.location.origin })
      } else {
        alert('Sharing not supported on this browser. Try downloading instead.')
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('share error', e)
    } finally {
      setCapturing(false)
    }
  }

  function shareToTwitter() {
    const sportObj = SPORTS.find(s => s.id === data.sport) || { emoji: '🏸', label: 'Badminton' }
    const isWin    = data.result === 'win'
    const opp      = data.opponentProfile?.username || data.opponentName
    const streakTag = (data.winStreak || 0) >= 3 ? ` 🔥${data.winStreak}-game streak!` : ''
    const text = encodeURIComponent(
      `${isWin ? '🏆 Victory' : '😤 Defeat'} ${sportObj.emoji} ${data.score || ''} ${opp ? `vs @${opp}` : ''}${streakTag} on OpenPlay! #OpenPlay #${sportObj.label.replace(/\s/g, '')}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=600,height=400')
  }

  function shareToFacebook() {
    const url = encodeURIComponent(window.location.origin)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/user/${data.myProfile?.username || ''}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isWin = data.result === 'win'
  const accentColor = isWin ? '#C8FF00' : '#FF4D00'

  const VARIANTS = [
    { id: 'clean',  label: '✦ Clean',  available: true },
    { id: 'flex',   label: '🔥 Flex',   available: isWin && (data.winStreak || 0) >= 1 },
    { id: 'upset',  label: '😤 Upset',  available: isWin },
  ]

  const renderCard = () => {
    switch (variant) {
      case 'flex':  return <FlexCard  data={data} cardRef={cardRef} />
      case 'upset': return <UpsetCard data={data} cardRef={cardRef} />
      default:      return <CleanCard data={data} cardRef={cardRef} />
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 60, backdropFilter: 'blur(10px)',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
        background: '#0f0f1a',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2rem 2rem 0 0',
        padding: '20px 18px 44px',
        maxHeight: '95vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              Share Result
            </p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
              {isWin ? '🏆 Victory' : '😤 Defeat'} · {data.sport}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Variant tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {VARIANTS.map(v => (
            <button key={v.id} onClick={() => v.available && setVariant(v.id)} style={{
              flex: 1, padding: '6px 0',
              borderRadius: 10, border: 'none', cursor: v.available ? 'pointer' : 'not-allowed',
              background: variant === v.id ? accentColor : 'rgba(255,255,255,0.06)',
              color: variant === v.id ? '#0a0a0f' : v.available ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
              transition: 'all 0.15s', opacity: v.available ? 1 : 0.4,
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Card preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}>
          {renderCard()}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Download - full width */}
          <button onClick={downloadCard} disabled={capturing || !html2canvasReady} style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 0', borderRadius: 14,
            background: accentColor, color: '#0a0a0f',
            border: 'none', fontSize: 12, fontWeight: 900,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            opacity: (capturing || !html2canvasReady) ? 0.6 : 1,
            boxShadow: `0 0 20px ${accentColor}30`,
          }}>
            <Download size={15} />
            {capturing ? 'Capturing…' : 'Download Card'}
          </button>

          {/* Native share */}
          {navigator.share && (
            <button onClick={nativeShare} disabled={capturing} style={{
              gridColumn: '1 / -1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 14,
              background: 'rgba(255,255,255,0.07)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <Share2 size={14} />
              Share via…
            </button>
          )}

          <button onClick={shareToTwitter} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 12,
            background: 'rgba(29,161,242,0.1)', color: '#1DA1F2',
            border: '1px solid rgba(29,161,242,0.25)',
            fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
          }}>
            <Twitter size={13} /> X / Twitter
          </button>

          <button onClick={shareToFacebook} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 12,
            background: 'rgba(24,119,242,0.1)', color: '#1877F2',
            border: '1px solid rgba(24,119,242,0.25)',
            fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
          }}>
            <Facebook size={13} /> Facebook
          </button>

          <button onClick={copyLink} style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            color: copied ? '#C8FF00' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${copied ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
            fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
            transition: 'all 0.2s',
          }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Profile Link'}
          </button>
        </div>
      </div>
    </>
  )
}
