import { useEffect, useState } from 'react'
// Check this path! If FeedPage is in src/pages, and supabaseClient is in src/
// the path should be '../supabaseClient' (which you have).
import { supabase } from '../supabaseClient' 
import { useAuth } from '../hooks/useAuth'

export default function FeedPage() {
  const { user, loading } = useAuth() // Added 'loading' from your hook
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
        profiles ( username )
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
    
    // BUG FIX: Ensure user exists before trying to access user.id
    if (!user) {
      alert("You must be logged in to post!")
      return
    }
    
    if (!content.trim()) return

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content: content, 
        user_id: user.id // This will now only run if user is defined
      }])

    if (error) {
      console.error('Error sending post:', error.message)
    } else {
      setContent('')
      fetchPosts()
    }
  }

  // BUG FIX: Prevent the UI from rendering if the auth state is still loading
  if (loading) return <div style={{ padding: '20px' }}>Loading feed...</div>

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>What's on your mind?</h2>
      <form onSubmit={handleSendPost} style={{ marginBottom: '30px' }}>
        <textarea 
          style={{ width: '100%', height: '80px', borderRadius: '8px', padding: '10px', border: '1px solid #ccc' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type @username to mention..."
        />
        <button 
          type="submit" 
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer' 
          }}
        >
          Post to Feed
        </button>
      </form>

      <div className="feed">
        {posts.length === 0 ? (
          <p>No posts yet. Be the first!</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{ borderBottom: '1px solid #ddd', padding: '15px 0' }}>
              <strong style={{ color: '#007bff' }}>
                @{post.profiles?.username || 'anonymous'}
              </strong>
              <p style={{ margin: '5px 0' }}>{post.content}</p>
              <small style={{ color: '#999' }}>
                {new Date(post.inserted_at).toLocaleTimeString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
