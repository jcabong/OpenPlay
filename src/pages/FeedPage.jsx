import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { Send, AtSign } from 'lucide-react'

// ─── Parse content and highlight @mentions ───────────────────────────────────
function PostContent({ content, onMentionClick }) {
  const parts = content.split(/(@\w+)/g)
  return (
    <p className="text-ink-100 text-sm leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <button
            key={i}
            onClick={() => onMentionClick(part.slice(1))}
            className="text-accent font-semibold hover:underline focus:outline-none"
          >
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

// ─── Single post card ─────────────────────────────────────────────────────────
function PostCard({ post, onMentionClick }) {
  const name     = post.users?.name || 'Player'
  const username = post.users?.username || 'unknown'
  const avatar   = post.users?.avatar_url

  return (
    <article className="glass rounded-2xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {avatar ? (
          <img src={avatar} alt={name}
            className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-ink-600 flex items-center justify-center text-sm font-semibold text-ink-200 shrink-0">
            {name[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + username + time */}
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-ink-50">{name}</span>
            <span className="text-xs text-ink-500">@{username}</span>
            <span className="text-xs text-ink-600 ml-auto">
              {formatDistanceToNow(new Date(post.inserted_at), { addSuffix: true })}
            </span>
          </div>

          {/* Content with clickable @mentions */}
          <PostContent content={post.content} onMentionClick={onMentionClick} />
        </div>
      </div>
    </article>
  )
}

// ─── Mention autocomplete dropdown ───────────────────────────────────────────
function MentionDropdown({ suggestions, onSelect }) {
  if (!suggestions.length) return null
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 glass rounded-2xl border border-white/10 overflow-hidden z-50 shadow-xl">
      {suggestions.map(user => (
        <button
          key={user.id}
          onMouseDown={e => { e.preventDefault(); onSelect(user.username) }}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-7 h-7 rounded-full object-cover" alt={user.name} />
          ) : (
            <div className="w-7 h-7 rounded-full bg-ink-600 flex items-center justify-center text-xs font-semibold text-ink-200">
              {user.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-50">{user.name}</p>
            <p className="text-xs text-ink-500">@{user.username}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Main FeedPage ────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, profile, loading } = useAuth()
  const [posts, setPosts]               = useState([])
  const [content, setContent]           = useState('')
  const [posting, setPosting]           = useState(false)
  const [allUsers, setAllUsers]         = useState([])
  const [suggestions, setSuggestions]   = useState([])
  const [viewingUser, setViewingUser]   = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => { fetchPosts(); fetchAllUsers() }, [])

  // ── Fetch all users for autocomplete ──────────────────────────────────────
  async function fetchAllUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, name, username, avatar_url')
    setAllUsers(data || [])
  }

  // ── Fetch posts ────────────────────────────────────────────────────────────
  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`id, content, inserted_at, users ( id, name, username, avatar_url )`)
      .order('inserted_at', { ascending: false })
      .limit(50)

    if (!error) setPosts(data || [])
  }

  // ── Detect @mention typing for autocomplete ────────────────────────────────
  function handleContentChange(e) {
    const val = e.target.value
    setContent(val)

    const cursor = e.target.selectionStart
    const textUpToCursor = val.slice(0, cursor)
    const match = textUpToCursor.match(/@(\w*)$/)

    if (match) {
      const query = match[1].toLowerCase()
      setSuggestions(
        allUsers.filter(u =>
          u.id !== user?.id &&
          (u.username?.toLowerCase().includes(query) || u.name?.toLowerCase().includes(query))
        ).slice(0, 4)
      )
    } else {
      setSuggestions([])
    }
  }

  // ── Insert selected username into textarea ─────────────────────────────────
  function selectMention(username) {
    const cursor = textareaRef.current.selectionStart
    const before = content.slice(0, cursor).replace(/@\w*$/, '')
    const after  = content.slice(cursor)
    setContent(before + `@${username} ` + after)
    setSuggestions([])
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // ── Extract @mentions from content ────────────────────────────────────────
  function extractMentions(text) {
    return [...text.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase())
  }

  // ── Submit post ────────────────────────────────────────────────────────────
  async function handlePost(e) {
    e.preventDefault()
    if (!user || !content.trim() || posting) return
    setPosting(true)

    const { data: post, error } = await supabase
      .from('posts')
      .insert([{ content: content.trim(), user_id: user.id }])
      .select()
      .single()

    if (!error && post) {
      const mentionedUsernames = extractMentions(content)
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = allUsers.filter(u =>
          mentionedUsernames.includes(u.username?.toLowerCase())
        )
        if (mentionedUsers.length > 0) {
          await supabase.from('mentions').insert(
            mentionedUsers.map(u => ({ post_id: post.id, mentioned_user_id: u.id }))
          )
        }
      }
      setContent('')
      fetchPosts()
    }

    setPosting(false)
  }

  // ── Clicking a @mention shows that user's mini profile ────────────────────
  function handleMentionClick(username) {
    const found = allUsers.find(u => u.username?.toLowerCase() === username.toLowerCase())
    setViewingUser(found || null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pb-6">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-ink-50">Feed</h1>
        <p className="text-ink-400 text-sm mt-0.5">What's happening on the court</p>
      </div>

      {/* Compose box */}
      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url}
              className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" alt="you" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-ink-600 flex items-center justify-center text-sm font-semibold text-ink-200 shrink-0">
              {(profile?.name || 'U')[0].toUpperCase()}
            </div>
          )}

          <form onSubmit={handlePost} className="flex-1 relative">
            <MentionDropdown suggestions={suggestions} onSelect={selectMention} />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="What happened on the court? Use @username to mention..."
              rows={3}
              className="w-full bg-transparent text-ink-100 placeholder-ink-600 text-sm resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1 text-ink-600 text-xs">
                <AtSign size={12} />
                <span>mention players</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${content.length > 270 ? 'text-spark' : 'text-ink-600'}`}>
                  {300 - content.length}
                </span>
                <button
                  type="submit"
                  disabled={!content.trim() || posting}
                  className="flex items-center gap-1.5 bg-accent text-ink-900 font-semibold text-xs px-3 py-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 transition-all"
                >
                  <Send size={12} />
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Clicked @mention mini-profile */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4"
          onClick={() => setViewingUser(null)}>
          <div className="glass rounded-2xl p-5 w-full max-w-sm border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              {viewingUser.avatar_url ? (
                <img src={viewingUser.avatar_url}
                  className="w-12 h-12 rounded-full object-cover border border-white/10" alt={viewingUser.name} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-ink-600 flex items-center justify-center font-semibold text-ink-200 text-lg">
                  {viewingUser.name[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-display font-bold text-ink-50">{viewingUser.name}</p>
                <p className="text-ink-500 text-sm">@{viewingUser.username}</p>
              </div>
            </div>
            <button onClick={() => setViewingUser(null)}
              className="w-full mt-3 py-2 text-sm text-ink-400 hover:text-ink-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏸</p>
            <p className="font-display text-ink-300 text-base font-semibold">No posts yet</p>
            <p className="text-ink-600 text-sm mt-1">Be the first to post!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} onMentionClick={handleMentionClick} />
          ))
        )}
      </div>
    </div>
  )
}
