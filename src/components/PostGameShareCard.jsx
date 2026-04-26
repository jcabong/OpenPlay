import { forwardRef } from 'react'

const SPORT_CONFIG = {
  badminton:   { emoji: '🏸', label: 'Badminton',    color: '#c8ff00', accent: '#0a0a0f' },
  pickleball:  { emoji: '🥒', label: 'Pickleball',   color: '#ff6b35', accent: '#fff' },
  tennis:      { emoji: '🎾', label: 'Tennis',        color: '#60a5fa', accent: '#fff' },
  tabletennis: { emoji: '🏓', label: 'Table Tennis',  color: '#a78bfa', accent: '#fff' },
}

// ── CleanCard ─────────────────────────────────────────────────────────────────
export const CleanCard = forwardRef(function CleanCard({ game, profile }, ref) {
  const sport = SPORT_CONFIG[game?.sport] || SPORT_CONFIG.badminton
  const isWin = game?.result === 'win'
  const username = profile?.username || 'player'

  return (
    <div ref={ref} style={{
      width: '360px', height: '360px', position: 'relative', overflow: 'hidden',
      background: '#0a0a0f', borderRadius: '24px', fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px',
      boxSizing: 'border-box',
    }}>
      {/* Background geometric */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '24px',
        background: isWin
          ? 'radial-gradient(ellipse at 80% 20%, rgba(200,255,0,0.12) 0%, transparent 60%)'
          : 'radial-gradient(ellipse at 80% 20%, rgba(255,77,77,0.12) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', right: '-40px', top: '-40px', width: '200px', height: '200px',
        borderRadius: '50%', border: `1px solid ${isWin ? 'rgba(200,255,0,0.15)' : 'rgba(255,77,77,0.15)'}`,
      }} />
      <div style={{
        position: 'absolute', right: '-10px', top: '-10px', width: '140px', height: '140px',
        borderRadius: '50%', border: `1px solid ${isWin ? 'rgba(200,255,0,0.1)' : 'rgba(255,77,77,0.1)'}`,
      }} />

      {/* Top row */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
            OpenPlay
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
            {sport.emoji} {sport.label}
          </div>
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
          padding: '6px 14px', borderRadius: '100px',
          background: isWin ? 'rgba(200,255,0,0.15)' : 'rgba(255,77,77,0.15)',
          color: isWin ? '#c8ff00' : '#ff4d4d',
          border: `1px solid ${isWin ? 'rgba(200,255,0,0.3)' : 'rgba(255,77,77,0.3)'}`,
        }}>
          {isWin ? 'WIN' : 'LOSS'}
        </div>
      </div>

      {/* Center */}
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: '80px', fontWeight: 900, lineHeight: 1, letterSpacing: '-4px', fontStyle: 'italic',
          color: isWin ? '#c8ff00' : '#ff4d4d', textTransform: 'uppercase',
        }}>
          {isWin ? 'WIN' : 'L'}
        </div>
        {game?.score && (
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
            {game.score}
          </div>
        )}
        {game?.opponent_name && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            vs {game.opponent_name}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>@{username}</div>
          {game?.court_name && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>📍 {game.court_name}</div>
          )}
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)',
        }}>
          openplay.gg
        </div>
      </div>
    </div>
  )
})

// ── FlexCard ──────────────────────────────────────────────────────────────────
export const FlexCard = forwardRef(function FlexCard({ game, profile }, ref) {
  const sport = SPORT_CONFIG[game?.sport] || SPORT_CONFIG.badminton
  const isWin = game?.result === 'win'
  const username = profile?.username || 'player'

  return (
    <div ref={ref} style={{
      width: '360px', height: '360px', position: 'relative', overflow: 'hidden',
      background: isWin ? '#0d1f00' : '#1a0505',
      borderRadius: '24px', fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
    }}>
      {/* Diagonal stripe background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isWin
          ? 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(200,255,0,0.03) 40px, rgba(200,255,0,0.03) 80px)'
          : 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,77,77,0.04) 40px, rgba(255,77,77,0.04) 80px)',
      }} />

      {/* Top accent bar */}
      <div style={{
        height: '5px', width: '100%', flexShrink: 0,
        background: isWin ? '#c8ff00' : '#ff4d4d',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 28px', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            {sport.emoji} {sport.label}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
            OpenPlay
          </div>
        </div>

        {/* Main stat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase',
            color: isWin ? 'rgba(200,255,0,0.6)' : 'rgba(255,77,77,0.6)', marginBottom: '8px',
          }}>
            {isWin ? '🏆 Victory' : '💀 Defeat'}
          </div>
          {game?.score ? (
            <div style={{
              fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-3px',
              color: isWin ? '#c8ff00' : '#ff4d4d',
            }}>
              {game.score}
            </div>
          ) : (
            <div style={{
              fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-3px', fontStyle: 'italic',
              color: isWin ? '#c8ff00' : '#ff4d4d',
            }}>
              {isWin ? 'WIN' : 'LOSS'}
            </div>
          )}
          {game?.opponent_name && (
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '10px', fontWeight: 600 }}>
              vs <span style={{ color: 'rgba(255,255,255,0.8)' }}>{game.opponent_name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>@{username}</div>
            {game?.court_name && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
                {game.court_name}{game?.city ? ` · ${game.city}` : ''}
              </div>
            )}
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 900,
            letterSpacing: '2px', textTransform: 'uppercase',
            background: isWin ? 'rgba(200,255,0,0.15)' : 'rgba(255,77,77,0.15)',
            color: isWin ? '#c8ff00' : '#ff4d4d',
            border: `1px solid ${isWin ? 'rgba(200,255,0,0.25)' : 'rgba(255,77,77,0.25)'}`,
          }}>
            {game?.intensity || 'Med'}
          </div>
        </div>
      </div>
    </div>
  )
})

// ── UpsetCard ─────────────────────────────────────────────────────────────────
export const UpsetCard = forwardRef(function UpsetCard({ game, profile }, ref) {
  const sport = SPORT_CONFIG[game?.sport] || SPORT_CONFIG.badminton
  const isWin = game?.result === 'win'
  const username = profile?.username || 'player'

  return (
    <div ref={ref} style={{
      width: '360px', height: '360px', position: 'relative', overflow: 'hidden',
      borderRadius: '24px', fontFamily: "'DM Sans', system-ui, sans-serif",
      background: isWin ? '#c8ff00' : '#ff4d4d',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '28px',
    }}>
      {/* Dark overlay pattern */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '24px',
        background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.06) 8px, rgba(0,0,0,0.06) 16px)',
      }} />
      {/* Big circle */}
      <div style={{
        position: 'absolute', right: '-60px', bottom: '-60px', width: '280px', height: '280px',
        borderRadius: '50%', background: 'rgba(0,0,0,0.15)',
      }} />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase',
            color: isWin ? 'rgba(10,10,15,0.55)' : 'rgba(255,255,255,0.7)',
          }}>
            {sport.emoji} {sport.label}
          </div>
          <div style={{
            fontSize: '11px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
            color: isWin ? 'rgba(10,10,15,0.4)' : 'rgba(255,255,255,0.5)',
          }}>
            OpenPlay
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            fontSize: '96px', fontWeight: 900, lineHeight: 1, letterSpacing: '-6px', fontStyle: 'italic',
            color: isWin ? '#0a0a0f' : 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase',
          }}>
            {isWin ? 'W' : 'L'}
          </div>
          {game?.score && (
            <div style={{
              fontSize: '28px', fontWeight: 900, color: isWin ? '#0a0a0f' : '#fff',
              marginTop: '-4px', letterSpacing: '-1px',
            }}>
              {game.score}
            </div>
          )}
          {game?.opponent_name && (
            <div style={{
              fontSize: '14px', fontWeight: 600, marginTop: '8px',
              color: isWin ? 'rgba(10,10,15,0.65)' : 'rgba(255,255,255,0.75)',
            }}>
              vs {game.opponent_name}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{
              fontSize: '16px', fontWeight: 900,
              color: isWin ? '#0a0a0f' : '#fff',
            }}>
              @{username}
            </div>
            {game?.court_name && (
              <div style={{
                fontSize: '11px', marginTop: '2px',
                color: isWin ? 'rgba(10,10,15,0.5)' : 'rgba(255,255,255,0.6)',
              }}>
                📍 {game.court_name}
              </div>
            )}
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: '100px',
            background: isWin ? 'rgba(10,10,15,0.15)' : 'rgba(255,255,255,0.2)',
            fontSize: '11px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
            color: isWin ? '#0a0a0f' : '#fff',
          }}>
            {isWin ? '🏆 FLEX' : '😤 NEXT'}
          </div>
        </div>
      </div>
    </div>
  )
})

export const CARD_VARIANTS = [
  { id: 'clean',  label: 'Clean',  Component: CleanCard },
  { id: 'flex',   label: 'Flex',   Component: FlexCard  },
  { id: 'upset',  label: 'Upset',  Component: UpsetCard },
]
