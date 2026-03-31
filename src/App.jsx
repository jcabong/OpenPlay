import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // Make sure this file exists in the same folder!

function App() {
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')

  // 1. Fetch posts when the page loads
  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('inserted_at', { ascending: false })
    setPosts(data || [])
  }

  // 2. Function to send a new post
  async function handleSubmit(e) {
    e.preventDefault()
    if (!content) return

    const { error } = await supabase
      .from('posts')
      .insert([{ content }]) // Note: once you have auth, add user_id here

    if (!error) {
      setContent('')
      fetchPosts() // Refresh the list
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🚀 Open Play Feed</h1>
      
      {/* Post Box */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}>
          Post
        </button>
      </form>

      {/* The Feed */}
      <div>
        {posts.map(post => (
          <div key={post.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            <p>{post.content}</p>
            <small style={{ color: 'gray' }}>{new Date(post.inserted_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*"     element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}