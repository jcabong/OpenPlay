import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, Trash2, MoreHorizontal, Pencil, X, Check, CornerDownRight, Twitter, Facebook, Maximize2 } from 'lucide-react'
import { supabase, SPORT_MAP } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { notifyMentions } from '../hooks/useNotifications'

function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part) ? (
          <Link key={i} to={`/user/${part.slice(1)}`}
            className="text-accent font-bold hover:underline"
            onClick={e => e.stopPropagation()}>
            {part}
          </Link>
        ) : <span key={i}>{part}</span>
      )}
    </>
  )
}

function MentionInput({ value, onChange, submitting, placeholder = 'Comment… use @ to tag someone' }) {
  const [results, setResults]   = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [caretPos, setCaretPos] = useState(0)
  const inputRef                = useRef(null)

  async function handleChange(e) {
    const val = e.target.value
    const pos = e.target.selectionStart
    setCaretPos(pos)
    onChange(val)
    const match = val.slice(0, pos).match(/@(\w*)$/)
    if (match && match[1].length >= 1) {
      const { data } = await supabase
        .from('users').select('id, username, display_name, avatar_url, avatar_type').ilike('username', `${match[1]}%`).limit(5)
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
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="relative flex gap-2">
      <div className="flex-1 relative">
        <input ref={inputRef} value={value} onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false) }}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-ink-400 focus:border-accent/50 outline-none transition-colors"
        />
        {showDrop && results.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-full bg-ink-700 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-slide-up">
            {results.map(u => (
              <button key={u.id} type="button" onMouseDown={() => pickUser(u.username)}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-none">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md overflow-hidden shrink-0">
                    {u.avatar_url && u.avatar_type !== 'initials' ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold bg-accent/20 text-accent">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-accent">@{u.username}</p>
                    {u.display_name && <p className="text-[10px] text-ink-400">{u.display_name}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" disabled={submitting}
        className="p-2.5 bg-accent text-ink-900 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0">
        <Send size={13} />
      </button>
    </div>
  )
}

function CommentRow({ comment, postId, currentUser, currentProfile, onRefresh }) {
  const username    = comment.users?.username || 'anon'
  const displayName = comment.users?.display_name || username
  const hasAvatar = comment.users?.avatar_url && comment.users?.avatar_type !== 'initials'
  const hasLiked    = comment.comment_likes?.some(l => l.user_id === currentUser?.id)
  const likeCount   = comment.comment_likes?.length || 0
  const replies     = comment.comment_replies || []
  const [showReply, setShowReply]     = useState(false)
  const [replyText, setReplyText]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  async function toggleLike() {
    if (!currentUser) return
    if (hasLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUser.id)
    } else {
      await supabase.from('comment_likes').insert([{ comment_id: comment.id, user_id: currentUser.id }])
    }
    onRefresh?.()
  }

  async function submitReply(e) {
    e.preventDefault()
    if (!replyText.trim() || !currentUser) return
    setSubmitting(true)
    await supabase.from('comment_replies').insert([{
      comment_id: comment.id,
      user_id:    currentUser.id,
      content:    replyText.trim(),
    }])
    if (replyText.includes('@')) {
      await notifyMentions({
        text:      replyText.trim(),
        fromUser:  { id: currentUser.id, username: currentProfile?.username || currentUser.email?.split('@')[0] || 'user' },
        postId,
        commentId: comment.id,
      })
    }
    setReplyText('')
    setSubmitting(false)
    setShowReply(false)
    setShowReplies(true)
    onRefresh?.()
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
          {hasAvatar ? (
            <img src={comment.users.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold bg-accent/20 text-accent">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 bg-white/5 px-3 py-2.5 rounded-xl border border-white/10">
          <div className="flex-1 min-w-0">
            <Link to={`/user/${comment.users?.id}`} className="text-accent font-bold text-[11px] hover:underline mr-1.5">
              {displayName}
            </Link>
            {displayName !== username && (
              <span className="text-ink-600 text-[10px] mr-1.5">@{username}</span>
            )}
            <span className="text-ink-200 text-[11px] leading-relaxed">
              <RichText text={comment.content} />
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={toggleLike}
              className={`flex items-center gap-1 text-[10px] font-black uppercase transition-colors ${hasLiked ? 'text-accent' : 'text-ink-600 hover:text-ink-300'}`}>
              <Heart size={11} className={hasLiked ? 'fill-accent' : ''} />
              GG {likeCount > 0 && `(${likeCount})`}
            </button>
            <button onClick={() => setShowReply(v => !v)}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-ink-600 hover:text-ink-300 transition-colors">
              <CornerDownRight size={11} />
              Reply
            </button>
            {replies.length > 0 && (
              <button onClick={() => setShowReplies(v => !v)}
                className="text-[10px] font-black uppercase text-ink-600 hover:text-accent transition-colors">
                {showReplies ? 'Hide replies' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplies && replies.length > 0 && (
        <div className="ml-8 space-y-1.5">
          {replies.map(r => {
            const rUsername    = r.users?.username || 'anon'
            const rDisplayName = r.users?.display_name || rUsername
            const rHasAvatar = r.users?.avatar_url && r.users?.avatar_type !== 'initials'
            return (
              <div key={r.id} className="flex gap-2">
                <div className="w-5 h-5 rounded-lg overflow-hidden shrink-0">
                  {rHasAvatar ? (
                    <img src={r.users.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold bg-accent/20 text-accent">
                      {rUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white/3 px-3 py-2 rounded-xl border border-white/5">
                  <Link to={`/user/${r.users?.id}`} className="text-accent font-bold text-[10px] hover:underline mr-1.5">
                    {rDisplayName}
                  </Link>
                  {rDisplayName !== rUsername && (
                    <span className="text-ink-600 text-[9px] mr-1.5">@{rUsername}</span>
                  )}
                  <span className="text-ink-300 text-[10px] leading-relaxed">
                    <RichText text={r.content} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showReply && (
        <div className="ml-8">
          <form onSubmit={submitReply}>
            <MentionInput value={replyText} onChange={setReplyText} submitting={submitting}
              placeholder={`Reply to ${displayName}…`} />
          </form>
        </div>
      )}
    </div>
  )
}

export default function PostCard({ post, onRefresh }) {
  const { user, profile }                 = useAuth()
  const [showComments, setShowComments]   = useState(false)
  const [newComment, setNewComment]       = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [showMenu, setShowMenu]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [editing, setEditing]             = useState(false)
  const [editContent, setEditContent]     = useState(post.content || '')
  const [saving, setSaving]               = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const menuRef                           = useRef(null)
  const shareMenuRef                      = useRef(null)

  const sport       = SPORT_MAP[post.sport] || {}
  const hasLiked    = post.likes?.some(l => l.user_id === user?.id)
  const likesCount  = post.likes?.length || 0
  const commCount   = post.comments?.length || 0
  const username    = post.author?.username || 'anon'
  const displayName = post.author?.display_name || username
  const hasAvatar   = post.author?.avatar_url && post.author?.avatar_type !== 'initials'
  const isOwner     = user?.id === post.author_id

  const hasMedia = post.media_urls?.length > 0
  const firstMedia = hasMedia ? post.media_urls[0] : null
  const firstMediaType = hasMedia ? post.media_types?.[0] : null
  const isVideo = firstMediaType === 'video'

  // Close menus when clicking outside
  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) setShowShareMenu(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  async function toggleLike() {
    if (!user) return
    if (hasLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }])
    }
    onRefresh?.()
  }

  async function deletePost() {
    if (!isOwner) return
    setDeleting(true)
    if (post.media_urls?.length > 0) {
      const paths = post.media_urls.map(url => url.split('/openplay-media/')[1]).filter(Boolean)
      if (paths.length) await supabase.storage.from('openplay-media').remove(paths)
    }
    await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user.id)
    setDeleting(false)
    setConfirmDelete(false)
    onRefresh?.()
  }

  async function saveEdit() {
    if (!editContent.trim()) return
    setSaving(true)
    await supabase.from('posts')
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq('id', post.id).eq('author_id', user.id)
    setSaving(false)
    setEditing(false)
    onRefresh?.()
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    const { data: comment } = await supabase.from('comments').insert([{
      post_id: post.id,
      user_id: user.id,
      content: newComment.trim(),
    }]).select('*, users(id, username, display_name, avatar_url, avatar_type)').single()

    if (newComment.includes('@')) {
      await notifyMentions({
        text:      newComment.trim(),
        fromUser:  { id: user.id, username: profile?.username || user.email?.split('@')[0] || 'user' },
        postId:    post.id,
        commentId: comment?.id || null,
      })
    }
    setNewComment('')
    setSubmitting(false)
    onRefresh?.()
  }

  // Share functions
  const getShareText = () => {
    const sportEmoji = sport.emoji || '🏸'
    const result = post.content ? post.content.substring(0, 100) : `Check out my ${sport.label || 'match'} on OpenPlay!`
    return `${sportEmoji} ${result}`
  }

  const getShareUrl = () => {
    return `${window.location.origin}/user/${post.author?.id}`
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText())
    const url = encodeURIComponent(getShareUrl())
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400')
    setShowShareMenu(false)
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(getShareUrl())
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400')
    setShowShareMenu(false)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      alert('Link copied to clipboard!')
    } catch (err) {
      console.error('Copy failed:', err)
    }
    setShowShareMenu(false)
  }

  const openMediaModal = (url) => {
    setSelectedMedia(url)
    setShowMediaModal(true)
  }

  return (
    <article className="glass rounded-[2.5rem] p-5 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent animate-slide-up">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/user/${post.author?.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className="w-10 h-10 rounded-[0.75rem] overflow-hidden shrink-0">
            {hasAvatar ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-accent text-ink-900">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-0.5 group-hover:text-accent transition-colors">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
              <span className="text-ink-500">@{username}</span>
              <span className="text-ink-700">·</span>
              <span className="text-ink-600">{new Date(post.inserted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
              {post.edited_at && <span className="text-white/20">· edited</span>}
            </div>
          </div>
        </Link>

        {sport.emoji && (
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 badge-${post.sport}`}>
            {sport.emoji} {sport.label}
          </span>
        )}

        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={() => setShowMenu(v => !v)}
              className="p-1.5 rounded-xl text-ink-600 hover:text-ink-300 hover:bg-white/5 transition-all">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 bg-ink-700 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[150px] animate-slide-up">
                <button onClick={() => { setShowMenu(false); setEditing(true); setEditContent(post.content || '') }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-white text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5">
                  <Pencil size={13} /> Edit Post
                </button>
                <button onClick={() => { setShowMenu(false); setConfirmDelete(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-spark text-xs font-black uppercase tracking-widest hover:bg-spark/10 transition-colors">
                  <Trash2 size={13} /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption */}
      {editing ? (
        <div className="mb-4 rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <textarea autoFocus value={editContent} onChange={e => setEditContent(e.target.value)}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white outline-none resize-none leading-relaxed"
            style={{ minHeight: '80px', caretColor: '#c8ff00' }} />
          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-white/40 hover:bg-white/5">
              <X size={12} /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving || !editContent.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase disabled:opacity-50"
              style={{ background: '#c8ff00', color: '#0a0a0f' }}>
              <Check size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-ink-100 text-sm leading-relaxed mb-3">
            <RichText text={post.content} />
          </p>
        )
      )}

      {/* Media - Video with play button overlay */}
      {hasMedia && (
        <div className="mb-4 rounded-2xl overflow-hidden bg-ink-800">
          {isVideo ? (
            <div className="relative cursor-pointer group" onClick={() => openMediaModal(firstMedia)}>
              <video 
                src={firstMedia} 
                className="w-full aspect-video object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
                <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
                  <svg className="w-7 h-7 text-ink-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-[10px] text-white flex items-center gap-1">
                <Maximize2 size={10} />
                <span>Fullscreen</span>
              </div>
            </div>
          ) : (
            <div className={`grid gap-0.5 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media_urls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative aspect-square cursor-pointer" onClick={() => openMediaModal(url)}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 3 && post.media_urls.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                      +{post.media_urls.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location */}
      {post.location_name && (
        <div className="flex items-center gap-1 text-ink-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 w-fit mb-3">
          <MapPin size={9} className="text-accent" />
          <span className="text-[9px] font-black uppercase tracking-tight">{post.location_name}</span>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mb-4 p-4 bg-spark/10 border border-spark/20 rounded-2xl animate-slide-up">
          <p className="text-sm text-white font-bold mb-1">Delete this post?</p>
          <p className="text-xs text-ink-500 mb-4">This cannot be undone. Any uploaded media will also be removed.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 glass rounded-xl text-ink-400 text-xs font-black uppercase tracking-widest border border-white/10">
              Cancel
            </button>
            <button onClick={deletePost} disabled={deleting}
              className="flex-1 py-2.5 bg-spark text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5">
              {deleting ? 'Deleting…' : <><Trash2 size={12} /> Delete</>}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <button onClick={toggleLike}
          className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border ${hasLiked ? 'text-accent border-accent/30 bg-accent/10' : 'text-ink-300 border-white/10 bg-white/5 hover:text-accent hover:border-accent/30'}`}>
          <Heart size={15} className={hasLiked ? 'fill-accent' : ''} />
          GG {likesCount > 0 && `(${likesCount})`}
        </button>
        <button onClick={() => setShowComments(v => !v)}
          className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border ${showComments ? 'text-white border-white/20 bg-white/10' : 'text-ink-300 border-white/10 bg-white/5 hover:text-white hover:border-white/20'}`}>
          <MessageCircle size={15} />
          Comments {commCount > 0 && `(${commCount})`}
        </button>
        
        {/* Share Button with Menu */}
        <div className="relative" ref={shareMenuRef}>
          <button 
            onClick={() => setShowShareMenu(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border text-ink-300 border-white/10 bg-white/5 hover:text-white hover:border-white/20">
            <Share2 size={14} />
            Share
          </button>
          
          {showShareMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-ink-700 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[180px] animate-slide-up">
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center gap-3 px-4 py-3 text-white text-xs font-bold hover:bg-white/5 transition-colors border-b border-white/5"
              >
                <Twitter size={16} className="text-[#1DA1F2]" />
                Share to X (Twitter)
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 px-4 py-3 text-white text-xs font-bold hover:bg-white/5 transition-colors border-b border-white/5"
              >
                <Facebook size={16} className="text-[#1877F2]" />
                Share to Facebook
              </button>
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-4 py-3 text-white text-xs font-bold hover:bg-white/5 transition-colors"
              >
                <Share2 size={16} className="text-accent" />
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-slide-up">
          {post.comments?.length > 0 && (
            <div className="space-y-2">
              {post.comments.map(c => (
                <CommentRow key={c.id} comment={c} postId={post.id}
                  currentUser={user} currentProfile={profile} onRefresh={onRefresh} />
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              {profile?.avatar_url && profile?.avatar_type !== 'initials' ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-accent/20 text-accent">
                  {(profile?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <form onSubmit={submitComment} className="flex-1">
              <MentionInput value={newComment} onChange={setNewComment} submitting={submitting} />
            </form>
          </div>
        </div>
      )}

      {/* Media Fullscreen Modal */}
      {showMediaModal && selectedMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setShowMediaModal(false)}
        >
          <div className="relative max-w-full max-h-full p-4">
            <button 
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              onClick={() => setShowMediaModal(false)}
            >
              <X size={24} />
            </button>
            {isVideo ? (
              <video 
                src={selectedMedia} 
                className="max-w-full max-h-[90vh]"
                controls 
                autoPlay
                playsInline
              />
            ) : (
              <img 
                src={selectedMedia} 
                className="max-w-full max-h-[90vh] object-contain" 
                alt="Fullscreen media"
              />
            )}
          </div>
        </div>
      )}
    </article>
  )
}