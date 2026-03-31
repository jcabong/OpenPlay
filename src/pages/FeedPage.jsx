import { useEffect, useState } from 'react'
// Corrected path to match the location used in your other pages
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'

export default function FeedPage() {
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        inserted_at,
        users ( name, username )
      `)
      .order('inserted_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error.message)
    } else {
      setPosts(data || [])
    }
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!user || !content.trim()) return

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content: content, 
        user_id: user.id 
      }])

    if (error) {
      console.error('Error sending post:', error.message)
    } else {
      setContent('')
      fetchPosts()
    }
  }

  if (loading) return <div className="min-h-screen bg-ink-900" />

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-50">Feed</h1>
        <p className="text-ink-500 text-sm">What's happening on the court</p>
      </header>
      
      {/* Post Composer - Uses your project's "glass" and "accent" styles */}
      <form 
        onSubmit={handleSendPost} 
        className="glass rounded-2xl p-4 border border-white/10 mb-8"
      >
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center font-display font-bold text-ink-900 shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <textarea 
            className="w-full bg-transparent border-none focus:ring-0 text-base text-ink-50 placeholder-ink-500 resize-none py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened on the court?"
            rows="3"
          />
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <span className="text-ink-500 text-[10px] font-bold uppercase tracking-widest">
            @mention players
          </span>
          <button 
            type="submit" 
            disabled={!content.trim()}
            className="bg-accent text-ink-900 font-display font-bold py-2 px-8 rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-all glow-accent"
          >
            Post
          </button>
        </div>
      </form>

      {/* Social Feed List */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-500">No posts yet. Be the first!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4 border border-white/5 animate-slide-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-ink-700 rounded-full flex items-center justify-center font-bold text-accent border border-white/10">
                  {(post.users?.username || 'u').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-ink-50 text-sm">
                    {post.users?.name || 'Player'}
                  </span>
                  <span className="text-accent text-xs font-medium">
                    @{post.users?.username || 'anonymous'}
                  </span>
                </div>
                <span className="ml-auto text-[10px] text-ink-500 font-mono">
                  {new Date(post.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-ink-200 text-sm leading-relaxed">
                {post.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}