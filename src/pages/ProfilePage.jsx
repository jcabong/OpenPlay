import { X, Maximize2 } from 'lucide-react' // Add Maximize2 to your imports

function PostRow({ post }) {
  const sport = SPORTS.find(s => s.id === post.sport)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  
  const hasMedia = post.media_urls?.length > 0
  const firstMedia = hasMedia ? post.media_urls[0] : null
  const firstMediaType = hasMedia ? post.media_types?.[0] : null
  const isVideo = firstMediaType === 'video'

  const openMediaModal = (url) => {
    setSelectedMedia(url)
    setShowMediaModal(true)
  }

  return (
    <>
      <div className="flex items-start gap-3 p-4 border-b border-white/5 last:border-none">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 bg-white/5">
          {sport ? sport.emoji : '💬'}
        </div>
        <div className="flex-1 min-w-0">
          {sport && (
            <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 block">
              {sport.label}
            </span>
          )}
          {post.content && (
            <p className="text-sm text-ink-200 leading-relaxed line-clamp-2">{post.content}</p>
          )}
          
          {/* Media Preview */}
          {hasMedia && (
            <div className="mt-2">
              {isVideo ? (
                <div 
                  className="relative rounded-xl overflow-hidden bg-ink-800 cursor-pointer group"
                  onClick={() => openMediaModal(firstMedia)}
                >
                  <video 
                    src={firstMedia} 
                    className="w-full max-h-48 object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
                    <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
                      <svg className="w-6 h-6 text-ink-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-[9px] text-white flex items-center gap-1">
                    <Maximize2 size={10} />
                    <span>Fullscreen</span>
                  </div>
                </div>
              ) : (
                <img 
                  src={firstMedia} 
                  alt="Post media" 
                  className="rounded-xl max-h-48 object-cover cursor-pointer"
                  onClick={() => openMediaModal(firstMedia)}
                />
              )}
              {post.media_urls.length > 1 && (
                <p className="text-[9px] text-ink-600 font-bold mt-1">
                  +{post.media_urls.length - 1} more
                </p>
              )}
            </div>
          )}
          
          {post.location_name && (
            <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-2">
              <MapPin size={8} />{post.location_name}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-ink-600 text-[10px] font-bold justify-end">
            <MessageSquare size={10} />
            {post.comments?.length || 0}
          </div>
          <p className="text-[9px] text-ink-700 mt-1">
            {new Date(post.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Media Fullscreen Modal */}
      {showMediaModal && selectedMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setShowMediaModal(false)}
        >
          <div className="relative max-w-full max-h-full p-4">
            <button 
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              onClick={() => setShowMediaModal(false)}
            >
              <X size={24} />
            </button>
            {isVideo ? (
              <video 
                src={selectedMedia} 
                className="max-w-full max-h-[90vh]"
                controls 
                autoPlay
                playsInline
              />
            ) : (
              <img 
                src={selectedMedia} 
                className="max-w-full max-h-[90vh] object-contain" 
                alt="Fullscreen media"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}