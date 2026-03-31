import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Image as ImageIcon, Video, BarChart3, X, Loader2, MessageSquare } from 'lucide-react'

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        location_name,
        users ( username, avatar_url )
      `)
      .order('inserted_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error.message)
    } else {
      setPosts(data || [])
    }
  }

  // FEATURE: Simulated GPS Tagging
  const handleGetLocation = () => {
    if (isLocating) return
    setIsLocating(true)
    
    // Using standard Geolocation API
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // For a real app, you'd use a Reverse Geocoding API here.
        // For now, we manually tag it to "Court Located" to show it works.
        setLocationName("Nearby Basketball Court")
        setIsLocating(false)
      },
      (err) => {
        console.error(err)
        setIsLocating(false)
        alert("Location access denied. Please enable GPS.")
      }
    )
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!user || !content.trim() || isSubmitting) return

    setIsSubmitting(true)

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content: content, 
        user_id: user.id,
        location_name: locationName
      }])

    if (error) {
      console.error('Error sending post:', error.message)
      alert("Post failed. Check if your username is set in Profile!")
    } else {
      setContent('')
      setLocationName(null)
      // Re-fetch immediately so the post "appears" for the user
      await fetchPosts()
    }
    setIsSubmitting(false)
  }

  if (authLoading) return <div className="min-h-screen bg-ink-900" />

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50 tracking-tighter italic uppercase">Feed</h1>
          <p className="text-ink-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">OpenPlay Community</p>
        </div>
        <div className="w-10 h-10 rounded-2xl border border-white/10 glass flex items-center justify-center text-accent shadow-[0_0_15px_rgba(200,255,0,0.1)]">
          <MessageSquare size={18} />
        </div>
      </header>
      
      {/* Post Composer */}
      <form 
        onSubmit={handleSendPost} 
        className="glass rounded-[2.5rem] p-5 border border-white/10 mb-10 shadow-2xl relative"
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center font-display font-bold text-ink-900 shrink-0 shadow-lg">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <textarea 
            className="w-full bg-transparent border-none focus:ring-0 text-base text-ink-50 placeholder-ink-700 resize-none py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your highlights or session stats..."
            rows="3"
          />
        </div>

        {locationName && (
          <div className="mt-2 ml-16 flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-wider bg-accent/10 w-fit px-3 py-1 rounded-full border border-accent/20 animate-in fade-in slide-in-from-left-2">
            <MapPin size={10} /> {locationName}
            <button type="button" onClick={() => setLocationName(null)} className="ml-1 hover:text-white">
              <X size={10} />
            </button>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <div className="flex gap-1">
            <button 
              type="button" 
              onClick={handleGetLocation}
              className={`p-2 rounded-xl transition-all ${isLocating ? 'text-accent' : 'text-ink-500 hover:text-accent hover:bg-white/5'}`}
            >
              <MapPin size={20} className={isLocating ? 'animate-pulse' : ''} />
            </button>
            <button type="button" className="p-2 text-ink-500 hover:text-ink-100 hover:bg-white/5 rounded-xl"><ImageIcon size={20} /></button>
            <button type="button" className="p-2 text-ink-500 hover:text-ink-100 hover:bg-white/5 rounded-xl"><Video size={20} /></button>
            <button type="button" className="p-2 text-ink-500 hover:text-accent hover:bg-white/5 rounded-xl"><BarChart3 size={20} /></button>
          </div>

          <button 
            type="submit" 
            disabled={!content.trim() || isSubmitting}
            className="bg-accent text-ink-900 font-display font-bold py-2.5 px-8 rounded-xl hover:bg-accent/90 disabled:opacity-20 transition-all glow-accent active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
          </button>
        </div>
      </form>

      {/* Social Feed List */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-20 glass rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-ink-600 font-bold uppercase text-xs tracking-widest">No activity in your area</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass rounded-[2.5rem] p-6 border border-white/5 shadow-sm hover:border-white/10 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-ink-800 rounded-xl flex items-center justify-center font-bold text-accent border border-white/5">
                  {(post.users?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-1">
                    @{post.users?.username || 'player'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-600 text-[9px] font-black uppercase tracking-widest">
                      {new Date(post.inserted_at).toLocaleDateString()}
                    </span>
                    {post.location_name && (
                      <span className="text-accent text-[9px] font-black uppercase tracking-widest flex items-center gap-0.5">
                        • <MapPin size={8} /> {post.location_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-ink-100 text-sm leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Strava-Style Stats Card (Triggers if post mentions 'stats') */}
              {post.content.toLowerCase().includes('stats') && (
                <div className="mt-5 grid grid-cols-3 gap-2 bg-ink-950/40 rounded-2xl p-4 border border-white/5">
                  <div className="text-center border-r border-white/5">
                    <p className="text-[7px] uppercase text-ink-600 font-black tracking-[0.2em] mb-1">Duration</p>
                    <p className="text-xs font-display font-bold text-ink-50 italic">1h 24m</p>
                  </div>
                  <div className="text-center border-r border-white/5">
                    <p className="text-[7px] uppercase text-ink-600 font-black tracking-[0.2em] mb-1">Intensity</p>
                    <p className="text-xs font-display font-bold text-accent italic uppercase">High</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] uppercase text-ink-600 font-black tracking-[0.2em] mb-1">Result</p>
                    <p className="text-xs font-display font-bold text-ink-50 italic uppercase">Win</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}