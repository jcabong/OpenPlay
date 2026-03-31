import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { MapPin, Heart, MessageCircle, Send, Loader2, Clock, Share2 } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentingOn, setCommentingOn] = useState(null)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    fetchGlobalFeed()
  }, [])

  async function fetchGlobalFeed() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (id, username, avatar_url),
        likes (user_id),
        comments (*, users(username))
      `)
      .order('inserted_at', { ascending: false })

    if (!error) {
      // Map data to include counts and "hasLiked" status
      const formattedPosts = data.map(post => ({
        ...post,
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(l => l.user_id === user?.id),
        comments_count: post.comments?.length || 0
      }))
      setPosts(formattedPosts)
    }
    setLoading(false)
  }

  async function handleGG(postId, hasLiked) {
    if (hasLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }])
    }
    fetchGlobalFeed() // Refresh to show new heart status
  }

  async function submitComment(postId) {
    if (!newComment.trim()) return
    const { error } = await supabase.from('comments').insert([
      { post_id: postId, user_id: user.id, content: newComment }
    ])
    if (!error) {
      setNewComment('')
      setCommentingOn(null)
      fetchGlobalFeed()
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter text-white">Network</h1>
          <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1 italic">Real-time OpenPlay Feed</p>
        </div>
        <button onClick={fetchGlobalFeed} className="p-2 bg-white/5 rounded-xl border border-white/10 text-ink-500 hover:text-accent transition-colors">
          <Clock size={20} />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={32} /></div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="glass rounded-[2.5rem] p-6 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
              
              {/* User Header - Clickable Profile */}
              <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 mb-4 group">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-ink-900 shadow-[0_0_15px_rgba(200,255,0,0.2)] group-hover:scale-105 transition-transform">
                  {(post.users?.username || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-1 group-hover:text-accent">
                    @{post.users?.username || 'anonymous'}
                  </span>
                  <span className="text-ink-600 text-[9px] font-black uppercase tracking-widest">
                    {new Date(post.inserted_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
              
              <p className="text-ink-100 text-sm mb-4 leading-relaxed font-medium">{post.content}</p>

              {/* Tags & Metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.sport && (
                  <span className="text-[8px] font-black uppercase bg-accent/10 text-accent px-2 py-1 rounded-md border border-accent/20">
                    {post.sport}
                  </span>
                )}
                {post.location_name && (
                  <div className="flex items-center gap-1 text-ink-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    <MapPin size={10} className="text-accent" />
                    <span className="text-[8px] font-black uppercase tracking-tight">{post.location_name}</span>
                  </div>
                )}
              </div>

              {/* Action Bar (GGs & Comments) */}
              <div className="flex gap-6 pt-4 border-t border-white/5">
                <button 
                  onClick={() => handleGG(post.id, post.user_has_liked)}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${post.user_has_liked ? 'text-accent' : 'text-ink-600 hover:text-ink-300'}`}
                >
                  <Heart size={18} className={post.user_has_liked ? "fill-accent" : ""} />
                  GG {post.likes_count > 0 && <span>({post.likes_count})</span>}
                </button>

                <button 
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-600 hover:text-ink-300 transition-colors"
                >
                  <MessageCircle size={18} />
                  Comment {post.comments_count > 0 && <span>({post.comments_count})</span>}
                </button>
              </div>

              {/* Inline Comment Section */}
              {commentingOn === post.id && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {/* Previous Comments */}
                  <div className="space-y-2">
                    {post.comments?.map(c => (
                      <div key={c.id} className="text-[11px] bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        <span className="text-accent font-bold mr-2">@{c.users?.username}</span>
                        <span className="text-ink-200">{c.content}</span>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <input 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-ink-800 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-accent outline-none transition-colors"
                    />
                    <button 
                      onClick={() => submitComment(post.id)}
                      className="p-2 bg-accent text-ink-900 rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}