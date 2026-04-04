import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, Trash2, MoreHorizontal, Pencil, X, Check } from 'lucide-react'
import { supabase, SPORT_MAP } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { notifyMentions } from '../hooks/useNotifications'

// Render text with clickable @mentions
function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part) ? (
          <Link
            key={i}
            to={`/user/${part.slice(1)}`}
            className="text-accent font-bold hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// Comment input with live @mention dropdown
function MentionInput({ value, onChange, submitting }) {
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
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="relative flex gap-2">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Escape') setShowDrop(false) }}
          placeholder="Comment… use @ to tag someone"
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-ink-400 focus:border-accent/50 outline-none transition-colors"
        />
        {showDrop && results.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-full bg-ink-700 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-slide-up">
            {results.map(u => (
              <button
                key={u.id}
                type="button"
                onMouseDown={() => pickUser(u.username)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-accent hover:bg-white/5 border-b border-white/5 last:border-none"
              >
                @{u.username}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="p-2.5 bg-accent text-ink-900 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0"
      >
        <Send size={13} />
      </button>
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
  const menuRef                           = useRef(null)

  const sport      = SPORT_MAP[post.sport] || {}
  const hasLiked   = post.likes?.some(l => l.user_id === user?.id)
  const likesCount = post.likes?.length || 0
  const commCount  = post.comments?.length || 0
  const username   = post.author?.username || 'anon'
  const initial    = username.charAt(0).toUpperCase()
  const isOwner    = user?.id === post.author_id

  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
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
    await supabase
      .from('posts')
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('author_id', user.id)
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
    }]).select().single()

    // Notify @mentions in comment
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

  const avatarColors = ['bg-accent text-ink-900','bg-spark text-white','bg-blue-500 text-white','bg-purple-500 text-white']
  const avatarColor  = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]

  return (
    <article className="glass rounded-[2.5rem] p-5 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent animate-slide-up">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/user/${username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor}`}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-0.5 group-hover:text-accent transition-colors">
              @{username}
            </p>
            <div className="flex items-center gap-2 text-ink-600 text-[9px] font-black uppercase tracking-widest">
              <span>{new Date(post.inserted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
              {post.edited_at && <span className="text-white/20">· edited</span>}
            </div>
          </div>
        </Link>

        {sport.emoji && (
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 badge-${post.sport}`}>
            {sport.emoji} {sport.label}
          </span>
        )}

        {/* Owner-only 3-dot menu */}
        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-1.5 rounded-xl text-ink-600 hover:text-ink-300 hover:bg-white/5 transition-all"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 bg-ink-700 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[150px] animate-slide-up">
                <button
                  onClick={() => { setShowMenu(false); setEditing(true); setEditContent(post.content || '') }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-white text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <Pencil size={13} /> Edit Post
                </button>
                <button
                  onClick={() => { setShowMenu(false); setConfirmDelete(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-spark text-xs font-black uppercase tracking-widest hover:bg-spark/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Caption above photo ── */}
      {editing ? (
        <div className="mb-4 rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <textarea
            autoFocus
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white outline-none resize-none leading-relaxed"
            style={{ minHeight: '80px', caretColor: '#c8ff00' }}
          />
          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-white/40 hover:bg-white/5"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !editContent.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase disabled:opacity-50"
              style={{ background: '#c8ff00', color: '#0a0a0f' }}
            >
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

      {/* ── Media (below caption) ── */}
      {post.media_urls?.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden bg-ink-800">
          {post.media_types?.[0] === 'video' ? (
            <video src={post.media_urls[0]} className="w-full aspect-video object-cover" controls />
          ) : (
            <div className={`grid gap-0.5 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media_urls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative aspect-square">
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

      {/* ── Location / Court tag ── */}
      {post.location_name && (
        <div className="flex items-center gap-1 text-ink-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 w-fit mb-3">
          <MapPin size={9} className="text-accent" />
          <span className="text-[9px] font-black uppercase tracking-tight">{post.location_name}</span>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="mb-4 p-4 bg-spark/10 border border-spark/20 rounded-2xl animate-slide-up">
          <p className="text-sm text-white font-bold mb-1">Delete this post?</p>
          <p className="text-xs text-ink-500 mb-4">This cannot be undone. Any uploaded media will also be removed.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 glass rounded-xl text-ink-400 text-xs font-black uppercase tracking-widest border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={deletePost}
              disabled={deleting}
              className="flex-1 py-2.5 bg-spark text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {deleting ? 'Deleting…' : <><Trash2 size={12} /> Delete</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border ${hasLiked ? 'text-accent border-accent/30 bg-accent/10' : 'text-ink-300 border-white/10 bg-white/5 hover:text-accent hover:border-accent/30'}`}
        >
          <Heart size={15} className={hasLiked ? 'fill-accent' : ''} />
          GG {likesCount > 0 && `(${likesCount})`}
        </button>

        <button
          onClick={() => setShowComments(v => !v)}
          className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border ${showComments ? 'text-white border-white/20 bg-white/10' : 'text-ink-300 border-white/10 bg-white/5 hover:text-white hover:border-white/20'}`}
        >
          <MessageCircle size={15} />
          Comments {commCount > 0 && `(${commCount})`}
        </button>

        <button className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-ink-300 hover:text-white transition-all px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 ml-auto">
          <Share2 size={14} />
        </button>
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-slide-up">
          {post.comments?.length > 0 && (
            <div className="space-y-2">
              {post.comments.map(c => (
                <div key={c.id} className="text-[11px] bg-white/5 px-3 py-2.5 rounded-xl border border-white/10 leading-relaxed text-ink-200">
                  <Link
                    to={`/user/${c.users?.username}`}
                    className="text-accent font-bold mr-2 hover:underline"
                  >
                    @{c.users?.username}
                  </Link>
                  <RichText text={c.content} />
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment}>
            <MentionInput value={newComment} onChange={setNewComment} submitting={submitting} />
          </form>
        </div>
      )}
    </article>
  )
}
