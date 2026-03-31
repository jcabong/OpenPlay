import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Image, Video, BarChart3, Loader2 } from 'lucide-react'

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [location, setLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, inserted_at, location_name, media_url, media_type,
        users ( username, avatar_url )
      `)
      .order('inserted_at', { ascending: false })

    if (!error) setPosts(data || [])
  }

  // --- FEATURE: GPS / Location Tagging ---
  const getDeviceLocation = () => {
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      // This is a simple string for now; you can use a Geocoding API to get City Name
      setLocation({ lat: latitude, lng: longitude, name: "Nearby Court" })
      setIsLocating(false)
    }, () => setIsLocating(false))
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!user || !content.trim()) return

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content, 
        user_id: user.id,
        location_name: location?.name || null,
        // You would add media_url logic here after setting up Supabase Storage
      }])

    if (!error) {
      setContent('')
      setLocation(null)
      fetchPosts()
    }
  }

  if (authLoading) return <div className="min-h-screen bg-ink-900" />

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8 font-sans">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">OpenPlay Feed</h1>
          <p className="text-ink-500 text-sm">Your community's highlights</p>
        </div>
      </header>
      
      {/* Post Composer */}
      <form onSubmit={handleSendPost} className="glass rounded-3xl p-5 border border-white/10 mb-8 shadow-2xl">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center font-display font-bold text-ink-900 shrink-0 shadow-lg">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <textarea 
            className="w-full bg-transparent border-none focus:ring-0 text-lg text-ink-50 placeholder-ink-600 resize-none py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your game summary..."
            rows="3"
          />
        </div>

        {location && (
          <div className="mt-2 ml-16 flex items-center gap-2 text-accent text-xs font-medium bg-accent/10 w-fit px-3 py-1 rounded-full border border-accent/20">
            <MapPin size={12} /> {location.name}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <div className="flex gap-2">
            {/* Location Toggle */}
            <button 
              type="button" 
              onClick={getDeviceLocation}
              className={`p-2 rounded-xl transition-all ${isLocating ? 'text-accent animate-spin' : 'text-ink-400 hover:bg-white/5'}`}
            >
              <MapPin size={20} />
            </button>
            {/* Media Icons (Placeholders for now) */}
            <button type="button" className="p-2 text-ink-400 hover:bg-white/5 rounded-xl"><Image size={20} /></button>
            <button type="button" className="p-2 text-ink-400 hover:bg-white/5 rounded-xl"><Video size={20} /></button>
            <button type="button" className="p-2 text-ink-400 hover:bg-white/5 rounded-xl"><BarChart3 size={20} /></button>
          </div>

          <button 
            type="submit" 
            disabled={!content.trim()}
            className="bg-accent text-ink-900 font-display font-bold py-2.5 px-8 rounded-xl hover:bg-accent/90 disabled:opacity-30 transition-all glow-accent"
          >
            Post
          </button>
        </div>
      </form>

      {/* Social Feed List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="glass rounded-3xl p-5 border border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-ink-700 rounded-full flex items-center justify-center font-bold text-accent border border-white/10 shadow-inner">
                {post.users?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-accent font-display font-bold text-sm tracking-tight">
                  @{post.users?.username || 'player'}
                </span>
                {post.location_name && (
                  <span className="text-ink-500 text-[10px] flex items-center gap-1">
                    <MapPin size={10} /> {post.location_name}
                  </span>
                )}
              </div>
              <span className="ml-auto text-[10px] text-ink-600 font-mono">
                {new Date(post.inserted_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-ink-100 text-base leading-relaxed mb-3">
              {post.content}
            </p>
            {/* Strava-style Stat Mockup */}
            {post.content.toLowerCase().includes('stats') && (
              <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="text-center"><p className="text-[10px] text-ink-500">Duration</p><p className="text-sm font-bold text-ink-50">1h 20m</p></div>
                <div className="text-center"><p className="text-[10px] text-ink-500">Intensity</p><p className="text-sm font-bold text-accent">High</p></div>
                <div className="text-center"><p className="text-[10px] text-ink-500">Result</p><p className="text-sm font-bold text-ink-50">Win</p></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}