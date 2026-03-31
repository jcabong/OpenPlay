import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Image as ImageIcon, Video, BarChart3 } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState(null)

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select(`id, content, inserted_at, location_name, users ( username )`)
      .order('inserted_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!content.trim()) return

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content, 
        user_id: user.id,
        location_name: locationName 
      }])

    if (!error) {
      setContent(''); setLocationName(null); fetchPosts();
    } else {
      alert("Error: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <h1 className="font-display text-3xl font-bold mb-6 italic uppercase">Feed</h1>
      
      <form onSubmit={handleSendPost} className="glass rounded-3xl p-5 border border-white/10 mb-8">
        <textarea 
          className="w-full bg-transparent border-none focus:ring-0 text-base text-ink-50 placeholder-ink-600 resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your game summary..."
          rows="3"
        />
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <div className="flex gap-2 text-ink-400">
            <button type="button" onClick={() => setLocationName("Main Court")} className={locationName ? "text-accent" : ""}><MapPin size={20} /></button>
            <button type="button"><ImageIcon size={20} /></button>
            <button type="button"><BarChart3 size={20} /></button>
          </div>
          <button type="submit" className="bg-accent text-ink-900 font-display font-bold py-2 px-6 rounded-xl">Post</button>
        </div>
      </form>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="glass rounded-3xl p-5 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-accent font-bold text-sm italic">@{post.users?.username || 'player'}</span>
              {post.location_name && <span className="text-ink-500 text-[10px] flex items-center gap-1"><MapPin size={8}/> {post.location_name}</span>}
            </div>
            <p className="text-ink-100 text-sm">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}