import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, Play } from 'lucide-react'
import { supabase, SPORT_MAP } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function PostCard({ post, onRefresh }) {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment]     = useState('')
  const [submitting, setSubmitting]     = useState(false)

  const sport      = SPORT_MAP[post.sport] || {}
  const hasLiked   = post.likes?.some(l => l.user_id === user?.id)
  const likesCount = post.likes?.length || 0
  const commCount  = post.comments?.length || 0
  const postUser   = post.author || post.users || {}
  const username   = postUser.username || 'anon'
  const initial    = username.charAt(0).toUpperCase()
  const profileId  = post.author_id || post.user_id

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
    await supabase.from('comments').insert([{ post_id: post.id, user_id: user.id, content: newComment.trim() }])
    setNewComment('')
    setSubmitting(false)
    onRefresh?.()
  }

  const avatarColors = ['bg-accent text-ink-900','bg-spark text-white','bg-blue-500 text-white','bg-purple-500 text-white']
  const avatarColor = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]

  return (
    <article className="glass rounded-[2.5rem] p-5 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent animate-slide-up">

      {/* Header */}
      <Link to={`/profile/${profileId}`} className="flex items-center gap-3 mb-4 group">
        <div className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor}`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-0.5 group-hover:text-accent transition-colors">
            @{username}
          </p>
          <div className="flex items-center gap-2 text-ink-600 text-[9px] font-black uppercase tracking-widest">
            <span>{new Date(post.inserted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
            {post.city && <><span>·</span><span>{post.city}</span></>}
          </div>
        </div>
        {sport.emoji && (
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg badge-${post.sport}`}>
            {sport.emoji} {sport.label}
          </span>
        )}
      </Link>

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden bg-ink-800">
          {post.media_types?.[0] === 'video' ? (
            <div className="relative aspect-video bg-ink-800 flex items-center justify-center">
              <video src={post.media_urls[0]} className="w-full h-full object-cover" controls />
            </div>
          ) : (
            <div className={`grid gap-1 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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

      {/* Content */}
      {post.content && (
        <p className="text-ink-100 text-sm leading-relaxed mb-4">{post.content}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {post.location_name && (
          <div className="flex items-center gap-1 text-ink-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
            <MapPin size={9} className="text-accent" />
            <span className="text-[9px] font-black uppercase tracking-tight">{post.location_name}</span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex gap-5 pt-3 border-t border-white/5">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${hasLiked ? 'text-accent' : 'text-ink-600 hover:text-ink-300'}`}
        >
          <Heart size={16} className={hasLiked ? 'fill-accent' : ''} />
          GG {likesCount > 0 && `(${likesCount})`}
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-600 hover:text-ink-300 transition-colors"
        >
          <MessageCircle size={16} />
          Comment {commCount > 0 && `(${commCount})`}
        </button>

        <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-600 hover:text-ink-300 transition-colors ml-auto">
          <Share2 size={14} />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-slide-up">
          {post.comments?.length > 0 && (
            <div className="space-y-2">
              {post.comments.map(c => (
                <div key={c.id} className="text-[11px] bg-white/[0.02] px-3 py-2 rounded-xl border border-white/5">
                  <span className="text-accent font-bold mr-2">@{c.users?.username}</span>
                  <span className="text-ink-300">{c.content}</span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-ink-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-accent/50 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="p-2.5 bg-accent text-ink-900 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
