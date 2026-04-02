import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, X, ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react'
import { supabase, SPORT_MAP } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Hashtag + mention renderer ───────────────────────────────
function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(\s+)/)
  return (
    <span>
      {parts.map((word, i) => {
        if (word.startsWith('#'))
          return <span key={i} style={{ color: '#c8ff00' }} className="font-bold cursor-pointer hover:underline">{word}</span>
        if (word.startsWith('@'))
          return <span key={i} style={{ color: '#60a5fa' }} className="font-bold cursor-pointer hover:underline">{word}</span>
        return <span key={i}>{word}</span>
      })}
    </span>
  )
}

// ─── Photo Lightbox ────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
        <X size={28} />
      </button>
      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + urls.length) % urls.length) }}
            className="absolute left-4 text-white/70 hover:text-white z-10 p-2"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % urls.length) }}
            className="absolute right-4 text-white/70 hover:text-white z-10 p-2"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}
      <img
        src={urls[idx]}
        alt=""
        className="object-contain rounded-xl"
        style={{ maxHeight: '90vh', maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      />
      {urls.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {urls.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === idx ? '#c8ff00' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single Comment with like + reply ─────────────────────────
function CommentItem({ comment, postId, user, onRefresh, depth = 0 }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const hasLiked = comment.comment_likes?.some(l => l.user_id === user?.id)
  const likeCount = comment.comment_likes?.length || 0
  const replyCount = comment.replies?.length || 0
  const username = comment.users?.username || 'anon'

  const avatarColors = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]

  async function toggleLike() {
    if (!user) return
    if (hasLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id)
    } else {
      await supabase.from('comment_likes').insert([{ comment_id: comment.id, user_id: user.id }])
    }
    onRefresh?.()
  }

  async function submitReply() {
    if (!replyText.trim() || !user) return
    setSubmitting(true)
    await supabase.from('comments').insert([{
      post_id: postId,
      user_id: user.id,
      content: replyText.trim(),
      parent_id: comment.id,
      created_at: new Date().toISOString(),
    }])
    setReplyText('')
    setReplying(false)
    setShowReplies(true)
    setSubmitting(false)
    onRefresh?.()
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className={depth > 0 ? 'ml-9 mt-2' : ''}>
      <div className="flex gap-2.5">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
          style={{ background: avatarBg, color: '#0a0a0f' }}
        >
          {username.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="text-xs font-black mr-2" style={{ color: '#c8ff00' }}>@{username}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <RichText text={comment.content} />
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1 ml-1">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {timeAgo(comment.created_at)}
            </span>
            <button
              onClick={toggleLike}
              className="flex items-center gap-1 text-[10px] font-bold transition-colors"
              style={{ color: hasLiked ? '#c8ff00' : 'rgba(255,255,255,0.35)' }}
            >
              <Heart size={11} className={hasLiked ? 'fill-current' : ''} />
              {likeCount > 0 && <span>{likeCount}</span>}
              <span className="ml-0.5">Like</span>
            </button>
            {depth === 0 && (
              <button
                onClick={() => setReplying(!replying)}
                className="text-[10px] font-bold transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Reply
              </button>
            )}
            {replyCount > 0 && depth === 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-[10px] font-bold"
                style={{ color: '#60a5fa' }}
              >
                <CornerDownRight size={10} />
                {showReplies ? 'Hide replies' : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>

          {replying && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                placeholder={`Reply to @${username}...`}
                className="flex-1 rounded-xl px-3 py-2 text-xs border-none focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', caretColor: '#c8ff00' }}
              />
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="px-3 py-2 rounded-xl text-xs font-black disabled:opacity-40 flex items-center"
                style={{ background: '#c8ff00', color: '#0a0a0f' }}
              >
                <Send size={12} />
              </button>
            </div>
          )}

          {showReplies && comment.replies?.map(reply => (
            <CommentItem key={reply.id} comment={reply} postId={postId} user={user} onRefresh={onRefresh} depth={1} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main PostCard ─────────────────────────────────────────────
export default function PostCard({ post, onRefresh }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const sport = SPORT_MAP[post.sport] || {}
  const hasLiked = post.likes?.some(l => l.user_id === user?.id)
  const likesCount = post.likes?.length || 0
  const postUser = post.author || post.users || {}
  const username = postUser.username || 'anon'
  const profileId = post.author_id || post.user_id

  const topComments = (post.comments || []).filter(c => !c.parent_id)
  const replies = (post.comments || []).filter(c => c.parent_id)
  const commentsWithReplies = topComments.map(c => ({
    ...c,
    replies: replies.filter(r => r.parent_id === c.id)
  }))
  const totalComments = post.comments?.length || 0

  const avatarColors = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]

  const mediaUrls = post.media_urls || []
  const mediaTypes = post.media_types || []
  const imageUrls = mediaUrls.filter((_, i) => mediaTypes[i] !== 'video')
  const videoUrl = mediaUrls.find((_, i) => mediaTypes[i] === 'video')

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  async function toggleLike() {
    if (!user) return
    if (hasLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }])
    }
    onRefresh?.()
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    await supabase.from('comments').insert([{
      post_id: post.id,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    }])
    setNewComment('')
    setSubmitting(false)
    onRefresh?.()
  }

  // Media grid heights — Twitter/Facebook style
  const gridConfig = {
    1: { cols: 'grid-cols-1', height: () => '400px' },
    2: { cols: 'grid-cols-2', height: () => '260px' },
    3: { cols: 'grid-cols-3', height: () => '200px' },
    4: { cols: 'grid-cols-2', height: () => '200px' },
  }
  const grid = gridConfig[Math.min(imageUrls.length, 4)] || gridConfig[4]

  return (
    <>
      {lightbox !== null && imageUrls.length > 0 && (
        <Lightbox urls={imageUrls} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}

      <article className="rounded-3xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>

        {/* ── Header ── */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Link to={`/profile/${profileId}`} className="shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm"
              style={{ background: avatarBg, color: '#0a0a0f' }}>
              {username.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${profileId}`}>
              <p className="font-black text-sm text-white hover:underline leading-tight">@{username}</p>
            </Link>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {timeAgo(post.created_at || post.inserted_at)}
              </span>
              {(post.city || post.location_name) && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <MapPin size={9} style={{ color: '#c8ff00' }} />
                  {post.location_name || post.city}
                </span>
              )}
              {sport.emoji && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(200,255,0,0.1)', color: '#c8ff00' }}>
                  {sport.emoji} {sport.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Caption ── */}
        {post.content && (
          <div className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <RichText text={post.content} />
          </div>
        )}

        {/* ── Video ── */}
        {videoUrl && (
          <video src={videoUrl} className="w-full object-contain" style={{ maxHeight: '360px', background: '#000' }} controls />
        )}

        {/* ── Photo grid ── */}
        {imageUrls.length > 0 && (
          <div className={`grid gap-0.5 ${grid.cols}`}>
            {imageUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative cursor-pointer overflow-hidden"
                style={{ height: grid.height(i) }}
                onClick={() => setLightbox(i)}
              >
                <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                {i === 3 && imageUrls.length > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    +{imageUrls.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all hover:bg-white/5 active:scale-95"
            style={{ color: hasLiked ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}
          >
            <Heart size={16} className={hasLiked ? 'fill-current' : ''} />
            GG {likesCount > 0 && `· ${likesCount}`}
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all hover:bg-white/5 active:scale-95"
            style={{ color: showComments ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}
          >
            <MessageCircle size={16} />
            Comment {totalComments > 0 && `· ${totalComments}`}
          </button>

          <button
            onClick={() => navigator.share?.({ url: window.location.href }) || navigator.clipboard?.writeText(window.location.href)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all hover:bg-white/5 active:scale-95 ml-auto"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <Share2 size={14} />
          </button>
        </div>

        {/* ── Comments ── */}
        {showComments && (
          <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

            {/* Input */}
            <form onSubmit={submitComment} className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                style={{ background: user ? '#c8ff00' : 'rgba(255,255,255,0.1)', color: '#0a0a0f' }}>
                {user ? (user.email?.[0] || 'U').toUpperCase() : '?'}
              </div>
              <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={user ? 'Write a comment... #hashtag @mention' : 'Log in to comment'}
                  disabled={!user}
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs"
                  style={{ color: '#fff', caretColor: '#c8ff00' }}
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim() || !user}
                  className="shrink-0 disabled:opacity-30 transition-opacity"
                  style={{ color: '#c8ff00' }}
                >
                  <Send size={14} />
                </button>
              </div>
            </form>

            {/* Comment list */}
            {commentsWithReplies.length > 0 ? (
              <div className="space-y-3">
                {commentsWithReplies.map(c => (
                  <CommentItem key={c.id} comment={c} postId={post.id} user={user} onRefresh={onRefresh} />
                ))}
              </div>
            ) : (
              <p className="text-center text-xs py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                No comments yet — be the first! 🏸
              </p>
            )}
          </div>
        )}
      </article>
    </>
  )
}
