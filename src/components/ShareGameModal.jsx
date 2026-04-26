import { useState, useRef, useCallback } from 'react'
import { X, Download, Share2, Instagram, Send, Check, Loader2, Link } from 'lucide-react'
import { CARD_VARIANTS } from './PostGameShareCard'
import { supabase } from '../lib/supabase'

async function cardToBlob(cardEl) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(cardEl, {
    backgroundColor: '#0a0a0f',
    scale: 3,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: 360,
    height: 360,
    windowWidth: 360,
    windowHeight: 360,
  })
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1))
}

async function cardToDataURL(cardEl) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(cardEl, {
    backgroundColor: '#0a0a0f',
    scale: 3,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: 360,
    height: 360,
    windowWidth: 360,
    windowHeight: 360,
  })
  return canvas.toDataURL('image/png')
}

export default function ShareGameModal({ game, profile, onClose, onPostToFeed }) {
  const [selectedVariant, setSelectedVariant] = useState('clean')
  const [downloading, setDownloading]         = useState(false)
  const [posting, setPosting]                 = useState(false)
  const [copied, setCopied]                   = useState(false)
  const [caption, setCaption]                 = useState('')
  const [showCaptionInput, setShowCaptionInput] = useState(false)
  const cardRef = useRef(null)

  const SelectedCard = CARD_VARIANTS.find(v => v.id === selectedVariant)?.Component

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const blob = await cardToBlob(cardRef.current)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `openplay-${game?.result || 'match'}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      alert('Could not download image. Try a different browser.')
    } finally {
      setDownloading(false)
    }
  }, [game])

  const handleInstagramStory = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const blob = await cardToBlob(cardRef.current)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'card.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], `openplay-${game?.result}.png`, { type: 'image/png' })],
          title: 'OpenPlay Match',
        })
      } else {
        // Fallback: download then prompt
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url
        a.download = `openplay-instagram-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        alert('Image saved! Open Instagram → Stories → select the image.')
      }
    } catch (err) {
      console.error('Instagram share error:', err)
    }
  }, [game])

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/user/${profile?.username || ''}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Could not copy link')
    }
  }, [profile])

  const handlePostToFeed = useCallback(async () => {
    if (!cardRef.current) return
    setPosting(true)
    try {
      const dataURL = await cardToDataURL(cardRef.current)
      const res     = await fetch(dataURL)
      const blob    = await res.blob()
      const file    = new File([blob], `match-card-${Date.now()}.png`, { type: 'image/png' })

      const path = `${profile?.id || 'anon'}/${Date.now()}-match-card.png`
      const { error: uploadError } = await supabase.storage
        .from('openplay-media')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('openplay-media')
        .getPublicUrl(path)

      const sportEmoji = { badminton: '🏸', pickleball: '🥒', tennis: '🎾', tabletennis: '🏓' }[game?.sport] || '🎾'
      const autoCaption = caption.trim() ||
        `${sportEmoji} Just logged a match! Result: ${game?.result?.toUpperCase()}${game?.score ? ` (${game.score})` : ''}${game?.opponent_name ? ` vs ${game.opponent_name}` : ''}`

      // Insert post directly — no callback race condition
      const { error: postError } = await supabase.from('posts').insert([{
        author_id:     profile?.id,
        user_id:       profile?.id,
        content:       autoCaption,
        sport:         game?.sport || null,
        media_urls:    [publicUrl],
        media_types:   ['image'],
        location_name: game?.court_name || null,
        game_id:       game?.id || null,
        inserted_at:   new Date().toISOString(),
        created_at:    new Date().toISOString(),
      }])

      if (postError) throw postError

      // Also bubble up for any parent logic (notifications etc)
      onPostToFeed?.({
        mediaUrl:     publicUrl,
        caption:      autoCaption,
        sport:        game?.sport || null,
        locationName: game?.court_name || null,
        gameId:       game?.id || null,
      })

      onClose()
    } catch (err) {
      console.error('Post to feed error:', err)
      alert('Could not post to feed: ' + err.message)
    } finally {
      setPosting(false)
    }
  }, [game, profile, caption, onPostToFeed, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed z-50 bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px]
        rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden"
        style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92vh' }}>

        {/* Drag pill */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-black text-white text-base uppercase italic tracking-tight">Share Match</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Choose a card style
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 70px)' }}>
          {/* Hidden full-size card for capture (html2canvas target) */}
          {SelectedCard && (
            <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
              <SelectedCard ref={cardRef} game={game} profile={profile} />
            </div>
          )}

          {/* Visible scaled preview */}
          <div className="flex justify-center py-6 px-6">
            <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-50px' }}>
              {SelectedCard && (
                <SelectedCard game={game} profile={profile} />
              )}
            </div>
          </div>

          {/* Variant tabs */}
          <div className="flex gap-2 px-6 mb-5">
            {CARD_VARIANTS.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all"
                style={selectedVariant === v.id
                  ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.3)' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Caption input toggle for Post to Feed */}
          <div className="px-6 mb-3">
            {showCaptionInput ? (
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Caption (optional)
                  </span>
                  <button onClick={() => setShowCaptionInput(false)} style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <X size={13} />
                  </button>
                </div>
                <textarea
                  className="w-full bg-transparent px-4 pb-3 text-sm text-white resize-none focus:outline-none"
                  style={{ caretColor: '#c8ff00', minHeight: '70px' }}
                  placeholder="Add a caption for your feed post…"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowCaptionInput(true)}
                className="text-xs font-bold transition-colors hover:opacity-100"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                + Add caption for feed post
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-6 pb-8 space-y-3">
            {/* Post to Feed — primary */}
            <button
              onClick={handlePostToFeed}
              disabled={posting}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.3)' }}
            >
              {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {posting ? 'Posting…' : 'Post to Feed'}
            </button>

            <div className="grid grid-cols-3 gap-2">
              {/* Download */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase border-2 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Save
              </button>

              {/* Instagram Story */}
              <button
                onClick={handleInstagramStory}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase border-2 transition-all active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Instagram size={18} />
                Story
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase border-2 transition-all active:scale-[0.97]"
                style={copied
                  ? { background: 'rgba(200,255,0,0.1)', borderColor: 'rgba(200,255,0,0.3)', color: '#c8ff00' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
                }
              >
                {copied ? <Check size={18} /> : <Link size={18} />}
                {copied ? 'Copied!' : 'Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
