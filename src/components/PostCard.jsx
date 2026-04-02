import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Share2, Trash2, MoreHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Revamped RichText to handle clickable mentions
function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(\s+)/)
  return (
    <span>
      {parts.map((word, i) => {
        if (word.startsWith('#'))
          return <span key={i} className="text-accent font-bold cursor-pointer hover:underline">{word}</span>
        if (word.startsWith('@')) {
          const username = word.substring(1).replace(/[^a-zA-Z0-9_]/g, '')
          return (
            <Link key={i} to={`/profile/${username}`} className="text-blue-400 font-bold hover:underline">
              {word}
            </Link>
          )
        }
        return <span key={i}>{word}</span>
      })}
    </span>
  )
}

export default function PostCard({ post, user, onRefresh }) {
  const [deleting, setDeleting] = useState(false)
  const isAuthor = user?.id === post.author_id

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this post?")) return
    
    setDeleting(true)
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    
    if (error) {
      alert("Error deleting post: " + error.message)
      setDeleting(false)
    } else {
      onRefresh() // Refresh the feed/profile after deletion
    }
  }

  return (
    <article className="glass rounded-3xl p-4 mb-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <Link to={`/profile/${post.author?.username}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ink-700 overflow-hidden">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent font-bold">
                {post.author?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-ink-50">@{post.author?.username}</p>
            <p className="text-[10px] text-ink-400 uppercase tracking-widest">Just now</p>
          </div>
        </Link>

        {isAuthor && (
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-ink-400 hover:text-spark transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="text-sm text-ink-100 leading-relaxed mb-4">
        <RichText text={post.content} />
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-6 pt-3 border-t border-white/5">
        <button className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors">
          <Heart size={18} />
          <span className="text-xs font-bold">{post.likes?.length || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-ink-400 hover:text-accent transition-colors">
          <MessageCircle size={18} />
          <span className="text-xs font-bold">{post.comments?.length || 0}</span>
        </button>
      </div>
    </article>
  )
}