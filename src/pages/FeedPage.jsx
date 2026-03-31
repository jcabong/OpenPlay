import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient' // Adjust path if needed
import { useAuth } from '../hooks/useAuth'

export default function FeedPage() {
  const { user } = useAuth()
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

    if (!error) setPosts(data)
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!content.trim()) return

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content: content, 
        user_id: user.id 
      }])

    if (!error) {
      setContent('')
      fetchPosts()
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>What's on your mind?</h2>
      <form onSubmit={handleSendPost} style={{ marginBottom: '30px' }}>
        <textarea 
          style={{ width: '100%', height: '80px', borderRadius: '8px', padding: '10px' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type @username to mention..."
        />
        <button type="submit" style={{ marginTop: '10px', padding: '8px 16px' }}>
          Post to Feed
        </button>
      </form>

      <div className="feed">
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: '1px solid #ddd', padding: '15px 0' }}>
            <strong style={{ color: '#007bff' }}>
              @{post.profiles?.username || 'user'}
            </strong>
            <p>{post.content}</p>
            <small style={{ color: '#999' }}>
              {new Date(post.inserted_at).toLocaleTimeString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  )
}
