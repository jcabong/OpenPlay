import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Image as ImageIcon, Video, X, Loader2, MessageSquare, Target } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [mediaUrl, setMediaUrl] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, users!inner(username, avatar_url)')
      .order('inserted_at', { ascending: false })
    if (data) setPosts(data)
  }

  const handleGetLocation = () => {
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        const data = await res.json()
        const place = data.address.amenity || data.address.leisure || data.address.road || "Detected Court"
        setLocationName(place)
      } catch (err) {
        setLocationName("Nearby Court")
      } finally {
        setIsLocating(false)
      }
    }, () => setIsLocating(false), { enableHighAccuracy: true })
  }

  async function uploadPhoto(e) {
    setUploading(true)
    const file = e.target.files[0]
    if (!file) return
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Math.random()}.${fileExt}`
    const { error } = await supabase.storage.from('post-media').upload(filePath, file)
    if (!error) {
      const { data } = supabase.storage.from('post-media').getPublicUrl(filePath)
      setMediaUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!user || (!content.trim() && !mediaUrl) || isSubmitting) return
    setIsSubmitting(true)
    const { error } = await supabase.from('posts').insert([{ 
      content, user_id: user.id, location_name: locationName, media_url: mediaUrl 
    }])
    if (!error) {
      setContent(''); setLocationName(null); setMediaUrl(null); fetchPosts();
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <h1 className="font-display text-3xl font-bold italic uppercase mb-8">Feed</h1>
      <form onSubmit={handleSendPost} className="glass rounded-[2rem] p-5 border border-white/10 mb-10">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-ink-900">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <textarea className="w-full bg-transparent border-none focus:ring-0 text-ink-50 placeholder-ink-700 resize-none"
            value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's the play?" rows="2" />
        </div>
        {mediaUrl && <div className="mt-4 ml-14 relative"><img src={mediaUrl} className="rounded-2xl w-full max-h-48 object-cover"/><button onClick={() => setMediaUrl(null)} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><X size={14}/></button></div>}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <div className="flex gap-3 text-ink-500">
            <button type="button" onClick={handleGetLocation} className={isLocating ? "text-accent animate-pulse" : ""}><MapPin size={20} /></button>
            <input type="file" ref={fileInputRef} onChange={uploadPhoto} className="hidden" accept="image/*" />
            <button type="button" onClick={() => fileInputRef.current.click()} className={uploading ? "text-accent animate-bounce" : ""}><ImageIcon size={20} /></button>
          </div>
          <button type="submit" className="bg-accent text-ink-900 font-display font-bold py-2 px-6 rounded-xl glow-accent">Post</button>
        </div>
      </form>
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="glass rounded-[2rem] p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-ink-800 rounded-xl flex items-center justify-center font-bold text-accent">{(post.users?.username || 'P').charAt(0).toUpperCase()}</div>
              <div className="flex flex-col">
                <span className="text-ink-50 font-display font-bold text-sm leading-none mb-1">@{post.users?.username || 'player'}</span>
                <span className="text-ink-600 text-[9px] uppercase font-black">{new Date(post.inserted_at).toLocaleDateString()} {post.location_name && `• ${post.location_name}`}</span>
              </div>
            </div>
            <p className="text-ink-100 text-sm mb-4">{post.content}</p>
            {post.media_url && <img src={post.media_url} className="rounded-2xl w-full border border-white/5 mb-2" />}
          </div>
        ))}
      </div>
    </div>
  )
}