import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, Trash2, MoreHorizontal } from 'lucide-react'
import { supabase, SPORT_MAP } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── REVAMPED RICH TEXT (Clickable Mentions) ───────────────────
function RichText({ text }) {
  if (!text) return null
  // Split by whitespace but keep the delimiters
  const parts = text.split(/(\s+)/)
  return (
    <span>
      {parts.map((word, i) => {
        if (word.startsWith('#')) {
          return <span key={i} style={{ color: '#c8ff00' }} className="font-bold cursor-pointer hover:underline">{word}</span>
        }
        if (word.startsWith('@')) {
          const username = word.substring(1).replace(/[^a-zA-Z0-9_]/g, '')
          return (
            <Link 
              key={i} 
              to={`/profile/${username}`} 
              className="font-bold hover:underline" 
              style={{ color: '#60a5fa' }}
              onClick={(e) => e.stopPropagation()}
            >
              {word}
            </Link>
          )
        }
        return <span key={i}>{word}</span>
      })}
    </span>
  )
}

export default function PostCard({ post, onRefresh }) {
  const { user, profile } = useAuth()
  const [deleting, setDeleting] = useState(false)
  
  // Check if the logged-in user is the author
  // In your schema, it looks like author_id is the link
  const isAuthor = user?.id === post.author_id

  async function handleDelete(e) {
    e.preventDefault()
    if (!window.confirm("Delete this post permanently?")) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('author_id', user.id) // Safety check

      if (error) throw error
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error("Error:", error.message)
      alert("Could not delete post.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="glass rounded-[2rem] p-5 mb-4 animate-slide-up border border-white/5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-ink-700 overflow-hidden border border-white/10 flex items-center justify-center">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-accent font-black text-lg">
                {post.author?.username?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-ink-50">@{post.author?.username}</p>
              {post.tagged_sport && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold uppercase tracking-tighter">
                  {SPORT_MAP[post.tagged_sport]?.emoji} {post.tagged_sport}
                </span>
              )}
            </div>
            <p className="text-[10px] text-ink-500 font-bold uppercase tracking-widest mt-0.5">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </Link>

        {/* Delete Button - Only shown to owner */}
        {isAuthor && (
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-ink-500 hover:text-spark transition-colors disabled:opacity-30"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-spark border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="text-[15px] text-ink-100 leading-relaxed mb-4">
        <RichText text={post.content} />
      </div>

      {/* Media (If your post has images) */}
      {post.media_urls?.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4 border border-white/5">
           <img src={post.media_urls[0]} alt="Post content" className="w-full h-auto" />
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center gap-6 pt-4 border-t border-white/5">
        <button className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors">
          <Heart size={19} />
          <span className="text-xs font-black">{post.likes?.length || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors">
          <MessageCircle size={19} />
          <span className="text-xs font-black">{post.comments?.length || 0}</span>
        </button>
        <button className="ml-auto text-ink-600">
          <Share2 size={18} />
        </button>
      </div>
    </article>
  )
}