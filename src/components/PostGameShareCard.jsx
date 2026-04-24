import { useRef, useState, useEffect } from 'react'
import { X, Download, Share2, Twitter, Facebook, Copy, Check } from 'lucide-react'
import { SPORTS } from '../lib/supabase'

// Helper: get tier label + color from ELO
function getTier(elo) {
  if (!elo) return null
  if (elo >= 1800) return { label: 'Legend',   color: '#FF4D00', bg: 'rgba(255,77,0,0.15)'    }
  if (elo >= 1600) return { label: 'Diamond',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  }
  if (elo >= 1400) return { label: 'Platinum', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' }
  if (elo >= 1200) return { label: 'Gold',     color: '#C8FF00', bg: 'rgba(200,255,0,0.15)'   }
  if (elo >= 1000) return { label: 'Silver',   color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' }
  return                    { label: 'Bronze',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  }
}

// Inline avatar — works inside canvas-captured div
function Avatar({ url, avatarType, username, size = 40, radius = 12 }) {
  const initial = (username || '?').charAt(0).toUpperCase()
  const colors  = ['#C8FF00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const bg      = colors[(username?.charCodeAt(0) || 0) % colors.length]

  if (url && avatarType !== 'initials') {
    return (
      <img
        src={url}
        alt={username}
        crossOrigin="anonymous"
        style={{
          width: size, height: size,
          borderRadius: radius,
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size,
      borderRadius: radius,
      background: bg,
      color: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 900,
      fontSize: size * 0.38,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// ── The actual visual card (rendered to DOM, captured by html2canvas) ─────────
function ShareCardVisual({ data, cardRef }) {
  const {
    result, score, sport,
    myProfile, opponentProfile, opponentName,
    eloGained, eloCurrent, winRate, totalWins, totalGames,
    courtName, city,
  } = data

  const sportObj  = SPORTS.find(s => s.id === sport) || { emoji: '🏸', label: 'Racket' }
  const isWin     = result === 'win'
  const tier      = getTier(eloCurrent)
  const scoreDisplay = score || (isWin ? 'W' : 'L')
  const myUsername = myProfile?.username || 'Player'
  const oppUsername = opponentProfile?.username || opponentName || 'Opponent'

  return (
    <div
      ref={cardRef}
      style={{
        width: 320,
        background: '#0a0a0f',
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: isWin
          ? 'linear-gradient(90deg, #C8FF00, rgba(200,255,0,0.3))'
          : 'linear-gradient(90deg, #FF4D00, rgba(255,77,0,0.3))',
      }} />

      <div style={{ padding: '20px 20px 16px' }}>

        {/* Sport badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(200,255,0,0.08)',
          border: '1px solid rgba(200,255,0,0.2)',
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 9,
          fontWeight: 800,
          color: '#C8FF00',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 14,
        }}>
          {sportObj.emoji} {sportObj.label}
        </div>

        {/* Result + Score */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: isWin ? '#C8FF00' : '#FF4D00',
            marginBottom: 2,
          }}>
            {isWin ? 'Victory' : 'Defeat'}
          </div>
          <div style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            letterSpacing: '-2px',
          }}>
            {scoreDisplay}
          </div>
          {(courtName || city) && (
            <div style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              📍 {[courtName, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

        {/* My player row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}>
          <Avatar
            url={myProfile?.avatar_url}
            avatarType={myProfile?.avatar_type}
            username={myUsername}
            size={38}
            radius={10}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
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
            fontSize: 9,
            fontWeight: 800,
            color: isWin ? '#C8FF00' : '#FF4D00',
            background: isWin ? 'rgba(200,255,0,0.1)' : 'rgba(255,77,0,0.1)',
            border: `1px solid ${isWin ? 'rgba(200,255,0,0.25)' : 'rgba(255,77,0,0.25)'}`,
            borderRadius: 20,
            padding: '3px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {isWin ? 'WIN' : 'LOSS'}
          </div>
        </div>

        {/* VS divider */}
        {(opponentProfile || opponentName) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{
              fontSize: 8,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>VS</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}

        {/* Opponent row */}
        {(opponentProfile || opponentName) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}>
            <Avatar
              url={opponentProfile?.avatar_url}
              avatarType={opponentProfile?.avatar_type}
              username={oppUsername}
              size={38}
              radius={10}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                @{oppUsername}
              </div>
              {opponentProfile?.elo_rating && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  ELO {opponentProfile.elo_rating}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              color: '#FF4D00',
              background: 'rgba(255,77,0,0.08)',
              border: '1px solid rgba(255,77,0,0.2)',
              borderRadius: 20,
              padding: '3px 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {isWin ? 'LOSS' : 'WIN'}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 14,
        }}>
          {[
            { val: eloGained != null ? `${isWin ? '+' : ''}${eloGained}` : '—', label: 'ELO Δ', accent: true },
            { val: totalWins != null ? `${totalWins}` : '—',            label: 'Total Wins' },
            { val: winRate   != null ? `${winRate}%`  : '—',            label: 'Win Rate'   },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '9px 10px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 17,
                fontWeight: 800,
                color: s.accent ? (isWin ? '#C8FF00' : '#FF4D00') : '#ffffff',
                lineHeight: 1,
                marginBottom: 3,
              }}>
                {s.val}
              </div>
              <div style={{
                fontSize: 7,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: brand + tier */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Open<span style={{ color: '#C8FF00' }}>Play</span>
          </div>
          {tier && (
            <div style={{
              fontSize: 8,
              fontWeight: 800,
              color: tier.color,
              background: tier.bg,
              border: `1px solid ${tier.color}40`,
              borderRadius: 20,
              padding: '2px 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {tier.label} tier
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main modal exported ────────────────────────────────────────────────────────
export default function PostGameShareCard({ data, onClose }) {
  const cardRef         = useRef(null)
  const [copied, setCopied]   = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [html2canvasReady, setHtml2canvasReady] = useState(false)

  // Lazy-load html2canvas from CDN
  useEffect(() => {
    if (window.html2canvas) { setHtml2canvasReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => setHtml2canvasReady(true)
    document.head.appendChild(s)
  }, [])

  async function downloadCard() {
    if (!cardRef.current || !html2canvasReady) return
    setCapturing(true)
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `openplay-${data.result}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('html2canvas error', e)
    } finally {
      setCapturing(false)
    }
  }

  function shareToTwitter() {
    const sportObj = SPORTS.find(s => s.id === data.sport) || { emoji: '🏸', label: 'Badminton' }
    const isWin = data.result === 'win'
    const text = encodeURIComponent(
      `${isWin ? '🏆 Victory' : '😤 Defeat'} ${sportObj.emoji} ${data.score || ''} on OpenPlay! #OpenPlay #${sportObj.label.replace(/\s/g, '')}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=600,height=400')
  }

  function shareToFacebook() {
    const url = encodeURIComponent(window.location.origin)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.origin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 0',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 60,
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 61,
        background: '#0f0f1a',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2rem 2rem 0 0',
        padding: '24px 20px 40px',
        maxHeight: '92vh',
        overflowY: 'auto',
      }}>
        {/* Handle + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              Share Result
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {data.result === 'win' ? '🏆 Victory' : '😤 Defeat'} · {data.sport}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Card preview — centered */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <ShareCardVisual data={data} cardRef={cardRef} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <button
            onClick={downloadCard}
            disabled={capturing || !html2canvasReady}
            style={{
              ...btnBase,
              background: '#C8FF00',
              color: '#0a0a0f',
              border: 'none',
              opacity: (capturing || !html2canvasReady) ? 0.6 : 1,
              gridColumn: '1 / -1',
              padding: '13px 0',
              fontSize: 12,
              borderRadius: 14,
              boxShadow: '0 0 20px rgba(200,255,0,0.2)',
            }}
          >
            <Download size={15} />
            {capturing ? 'Capturing…' : 'Download Card'}
          </button>

          <button onClick={shareToTwitter} style={btnBase}>
            <Twitter size={14} style={{ color: '#1DA1F2' }} />
            X / Twitter
          </button>

          <button onClick={shareToFacebook} style={btnBase}>
            <Facebook size={14} style={{ color: '#1877F2' }} />
            Facebook
          </button>

          <button
            onClick={copyLink}
            style={{
              ...btnBase,
              gridColumn: '1 / -1',
              color: copied ? '#C8FF00' : 'rgba(255,255,255,0.7)',
              borderColor: copied ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </>
  )
}
