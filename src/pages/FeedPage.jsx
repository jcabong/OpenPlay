import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase' 
import { useAuth } from '../hooks/useAuth'
import { MapPin, Image as ImageIcon, Video, X, Loader2, MessageSquare, Camera } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [mediaUrl, setMediaUrl] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner (
          username,
          avatar_url
        )
      `)
      .order('inserted_at', { ascending: false })

    if (!error && data) setPosts(data)
  }

  // --- PHOTO UPLOAD LOGIC ---
  async function uploadPhoto(e) {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('post-media').getPublicUrl(filePath)
      setMediaUrl(data.publicUrl)
    } catch (error) {
      alert('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSendPost(e) {
    e.preventDefault()
    if (!user || (!content.trim() && !mediaUrl) || isSubmitting) return

    setIsSubmitting(true)

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        content: content, 
        user_id: user.id,
        location_name: locationName,
        media_url: mediaUrl // Saves the photo link to the post
      }])

    if (!error) {
      setContent('')
      setLocationName(null)
      setMediaUrl(null)
      await fetchPosts()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-4 pt-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold italic uppercase tracking-tighter">Feed</h1>
        <div className="bg-white/5 p-2 rounded-xl border border-white/10 text-accent">
            <MessageSquare size={20} />
        </div>
      </header>
      
      {/* Post Composer */}
      <form onSubmit={handleSendPost} className="glass rounded-[2rem] p-5 border border-white/10 mb-10 shadow-2xl">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-bold text-ink-900 shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <textarea 
            className="w-full bg-transparent border-none focus:ring-0 text-base text-ink-50 placeholder-ink-700 resize-none py-1"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the play today?"
            rows="2"
          />
        </div>

        {/* Preview Uploaded Image */}
        {mediaUrl && (
          <div className="relative mt-4 ml-14 group">
            <img src={mediaUrl} alt="Upload" className="rounded-2xl w-full max-h-48 object-cover border border-white/10" />
            <button 
              onClick={() => setMediaUrl(null)}
              className="absolute top-2 right-2 bg-ink-900/80 p-1 rounded-full text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <div className="flex gap-2 text-ink-500">
            <button type="button" onClick={() => setLocationName("Sunset Courts")} className={locationName ? "text-accent" : "hover:text-ink-100"}>
              <MapPin size={20} />
            </button>
            
            {/* Hidden File Input */}
            <input type="file" ref={fileInputRef} onChange={uploadPhoto} accept="image/*" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current.click()} className={uploading ? "animate-pulse text-accent" : "hover:text-ink-100"}>
              <ImageIcon size={20} />
            </button>
            
            <button type="button" className="hover:text-ink-100"><Video size={20} /></button>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || uploading}
            className="bg-accent text-ink-900 font-display font-bold py-2 px-6 rounded-xl glow-accent disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Post'}
          </button>
        </div>
      </form>

      {/* Social Feed List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="glass rounded-[2rem] p-6 border border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-ink-800 rounded-xl flex items-center justify-center font-bold text-accent border border-white/5">
                {(post.users?.username || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-ink-50 font-display font-bold text-sm tracking-tight leading-none mb-1">
                  @{post.users?.username || 'player'}
                </span>
                <span className="text-ink-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  {new Date(post.inserted_at).toLocaleDateString()}
                  {post.location_name && <span className="text-accent">• {post.location_name}</span>}
                </span>
              </div>
            </div>
            
            <p className="text-ink-100 text-sm mb-4">{post.content}</p>

            {post.media_url && (
              <img src={post.media_url} className="rounded-2xl w-full border border-white/5 mb-4 shadow-lg" alt="Post content" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}