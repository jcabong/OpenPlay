import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { MapPin, Edit2, Save, X, Loader2, Camera, Check, Trophy, MessageSquare, Maximize2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const DEFAULT_AVATARS = [
  { id: 'avatar-1', src: '/avatars/avatar-1.jpeg', label: 'Badminton M' },
  { id: 'avatar-2', src: '/avatars/avatar-2.jpeg', label: 'Badminton F' },
  { id: 'avatar-3', src: '/avatars/avatar-3.jpeg', label: 'Tennis M'    },
  { id: 'avatar-4', src: '/avatars/avatar-4.jpeg', label: 'Tennis F'    },
  { id: 'avatar-5', src: '/avatars/avatar-5.jpeg', label: 'Pickleball M'},
  { id: 'avatar-6', src: '/avatars/avatar-6.jpeg', label: 'Pickleball F'},
  { id: 'avatar-7', src: '/avatars/avatar-7.jpeg', label: 'Table Tennis M'},
  { id: 'avatar-8', src: '/avatars/avatar-8.jpeg', label: 'Table Tennis F'},
]

const TIER_COLORS = {
  Beginner:     { bg: 'rgba(255,255,255,0.06)',  text: 'rgba(255,255,255,0.4)',  border: 'rgba(255,255,255,0.1)'  },
  Casual:       { bg: 'rgba(96,165,250,0.12)',   text: '#60a5fa',               border: 'rgba(96,165,250,0.25)'  },
  Intermediate: { bg: 'rgba(167,139,250,0.12)',  text: '#a78bfa',               border: 'rgba(167,139,250,0.25)' },
  Advanced:     { bg: 'rgba(251,191,36,0.12)',   text: '#fbbf24',               border: 'rgba(251,191,36,0.25)'  },
  Elite:        { bg: 'rgba(200,255,0,0.12)',    text: '#c8ff00',               border: 'rgba(200,255,0,0.3)'    },
}

function AvatarPicker({ currentUrl, currentType, onSave, onClose }) {
  const [selected, setSelected]         = useState(currentUrl || null)
  const [selectedType, setSelectedType] = useState(currentType || 'initials')
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const fileRef                         = useRef(null)
  const { user }                        = useAuth()

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${user.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('openplay-media').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('openplay-media').getPublicUrl(path)
      setSelected(publicUrl)
      setSelectedType('custom')
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ url: selected, type: selectedType })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={{ background: '#0f0f1a' }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-black italic uppercase text-white">Choose Avatar</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="flex justify-center mb-5">
          {selected && selectedType !== 'initials' ? (
            <img src={selected} alt="avatar" className="w-24 h-24 rounded-[1.5rem] object-cover border-2 border-accent" />
          ) : (
            <div className="w-24 h-24 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl border-2 border-accent">
              {(user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-5 text-sm font-black uppercase tracking-widest border-2 border-dashed transition-all"
          style={{ borderColor: 'rgba(200,255,0,0.4)', color: '#c8ff00' }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Uploading...' : 'Upload My Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Default Avatars
        </p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {DEFAULT_AVATARS.map(av => {
            const isSelected = selected === av.src && selectedType === 'default'
            return (
              <button key={av.id} type="button"
                onClick={() => { setSelected(av.src); setSelectedType('default') }}
                className="relative flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-accent' : 'border-white/10'}`}>
                  <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={11} className="text-ink-900" />
                  </div>
                )}
                <span className="text-[9px] text-ink-500 font-bold text-center leading-tight">{av.label}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !selected}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-50"
          style={{ background: '#c8ff00', color: '#0a0a0f' }}
        >
          {saving ? 'Saving...' : 'Save Avatar'}
        </button>
      </div>
    </div>
  )
}

function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-spark/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-100 truncate">
          {sport?.label}
          {game.opponent_name && <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>}
        </p>
        {game.court_name && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{game.court_name}{game.city ? ` · ${game.city}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>
          {isWin ? 'WIN' : 'LOSS'}
        </p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

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
          {hasMedia && (
            <div className="mt-2">
              {isVideo ? (
                <div
                  className="relative rounded-xl overflow-hidden bg-ink-800 cursor-pointer group"
                  onClick={() => openMediaModal(firstMedia)}
                >
                  <video src={firstMedia} className="w-full max-h-48 object-cover" preload="metadata" />
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
                <p className="text-[9px] text-ink-600 font-bold mt-1">+{post.media_urls.length - 1} more</p>
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
              <video src={selectedMedia} className="max-w-full max-h-[90vh]" controls autoPlay playsInline />
            ) : (
              <img src={selectedMedia} className="max-w-full max-h-[90vh] object-contain" alt="Fullscreen media" />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function EloHistoryRow({ entry }) {
  const sport = SPORTS.find(s => s.id === entry.sport)
  const isWin = entry.result === 'win'
  const delta = entry.rating_delta

  return (
    <div className="flex items-center gap-3 p-3.5 border-b border-white/5 last:border-none">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${isWin ? 'bg-accent/10' : 'bg-spark/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-ink-200 truncate">
          {sport?.label || entry.sport}
          <span className="text-ink-500 font-normal"> · {isWin ? 'Win' : 'Loss'}</span>
        </p>
        <p className="text-[9px] text-ink-600 mt-0.5">
          {new Date(entry.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        <div className={`flex items-center gap-1 text-xs font-black ${delta > 0 ? 'text-accent' : delta < 0 ? 'text-spark' : 'text-ink-500'}`}>
          {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {delta > 0 ? '+' : ''}{delta}
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-ink-300">{entry.rating_after}</p>
          <p className="text-[9px] text-ink-600">ELO</p>
        </div>
      </div>
    </div>
  )
}

const TABS = ['Matches', 'Posts', 'ELO']

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate  = useNavigate()
  const [activeTab, setActiveTab] = useState('Matches')
  const [games, setGames]         = useState([])
  const [posts, setPosts]         = useState([])
  const [eloHistory, setEloHistory] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [formData, setFormData]   = useState({
    display_name: '',
    bio: '',
    city: '',
    region: '',
  })
  const [saving, setSaving]                     = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarUrl, setAvatarUrl]               = useState(profile?.avatar_url || null)
  const [avatarType, setAvatarType]             = useState(profile?.avatar_type || 'initials')
  const [saveMsg, setSaveMsg]                   = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio:          profile.bio          || '',
        city:         profile.city         || '',
        region:       profile.region       || '',
      })
      setAvatarUrl(profile.avatar_url   || null)
      setAvatarType(profile.avatar_type || 'initials')
    }
  }, [user, profile])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadGames(), loadPosts(), loadEloHistory()])
    setLoading(false)
  }

  async function loadGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setGames(data || [])
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, comments(id)')
      .eq('author_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  async function loadEloHistory() {
    const { data } = await supabase
      .from('elo_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setEloHistory(data || [])
  }

  async function saveAvatar({ url, type }) {
    const { error } = await supabase.from('users').update({
      avatar_url:  url,
      avatar_type: type,
    }).eq('id', user.id)
    if (!error) {
      setAvatarUrl(url)
      setAvatarType(type)
      refreshProfile()
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        display_name: formData.display_name,
        bio:          formData.bio,
        city:         formData.city,
        region:       formData.region,
      })
      .eq('id', user.id)

    if (!error) {
      setEditing(false)
      refreshProfile()
      setSaveMsg('Profile updated!')
      setTimeout(() => setSaveMsg(''), 3000)
    } else {
      setSaveMsg('Error updating profile')
      setTimeout(() => setSaveMsg(''), 3000)
    }
    setSaving(false)
  }

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate      = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0
  const initial      = (profile?.username || 'U').charAt(0).toUpperCase()
  const eloRating    = profile?.elo_rating ?? 1000
  const skillTier    = profile?.skill_tier  ?? 'Casual'
  const tierStyle    = TIER_COLORS[skillTier] || TIER_COLORS.Casual

  // ELO sparkline — last 10 entries reversed for chronological order
  const sparkData = [...eloHistory].reverse().slice(-10).map(e => e.rating_after)

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">My Profile</h1>
      </div>

      {/* Avatar + identity */}
      <div className="px-5 pb-4">
        <div className="relative w-20 h-20 mb-3">
          {avatarUrl && avatarType !== 'initials' ? (
            <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-[1.5rem] object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">
              {initial}
            </div>
          )}
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-ink-900"
            style={{ background: '#c8ff00' }}>
            <Camera size={13} className="text-ink-900" />
          </button>
        </div>

        {!editing ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter text-white">
                {profile?.display_name || `@${profile?.username}`}
              </h1>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-white/10">
                <Edit2 size={14} className="text-ink-500" />
              </button>
              {/* Skill tier badge */}
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border"
                style={{ background: tierStyle.bg, color: tierStyle.text, borderColor: tierStyle.border }}
              >
                {skillTier}
              </span>
            </div>
            <p className="text-accent text-sm font-bold mt-0.5">@{profile?.username}</p>
            {(profile?.city || profile?.region) && (
              <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-1.5">
                <MapPin size={11} className="text-accent" />
                {[profile?.city, profile?.region].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.bio && (
              <p className="text-ink-300 text-sm mt-3 leading-relaxed max-w-sm">{profile?.bio}</p>
            )}
            {saveMsg !== '' && (
              <p className={`text-xs font-bold mt-2 ${saveMsg.includes('Error') ? 'text-red-400' : 'text-accent'}`}>
                {saveMsg}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3 mt-2">
            <input
              type="text"
              value={formData.display_name}
              onChange={e => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="Display name"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
            />
            <textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Bio"
              rows={3}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white resize-none"
            />
            <input
              type="text"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
            />
            <input
              type="text"
              value={formData.region}
              onChange={e => setFormData({ ...formData, region: e.target.value })}
              placeholder="Region/Province"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
            />
            {saveMsg !== '' && (
              <p className={`text-xs font-bold ${saveMsg.includes('Error') ? 'text-red-400' : 'text-accent'}`}>
                {saveMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-accent text-ink-900 font-bold text-sm flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-white/5 text-ink-400 font-bold text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ELO Rating Card */}
      <div className="px-4 mb-4">
        <div
          className="rounded-[1.5rem] border p-4 flex items-center gap-4"
          style={{ background: tierStyle.bg, borderColor: tierStyle.border }}
        >
          {/* ELO number */}
          <div className="text-center shrink-0">
            <p className="font-display text-4xl font-bold italic leading-none" style={{ color: tierStyle.text }}>
              {eloRating}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: tierStyle.text, opacity: 0.7 }}>
              ELO Rating
            </p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch" style={{ background: tierStyle.border }} />

          {/* Sparkline */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: tierStyle.text, opacity: 0.7 }}>
              Recent trend
            </p>
            {sparkData.length > 1 ? (
              <svg width="100%" height="36" viewBox={`0 0 ${sparkData.length * 20} 36`} preserveAspectRatio="none">
                {(() => {
                  const min = Math.min(...sparkData)
                  const max = Math.max(...sparkData)
                  const range = max - min || 1
                  const pts = sparkData.map((v, i) => `${i * 20},${36 - ((v - min) / range) * 30 + 3}`)
                  return (
                    <>
                      <polyline
                        points={pts.join(' ')}
                        fill="none"
                        stroke={tierStyle.text}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                      />
                      {sparkData.map((v, i) => (
                        <circle
                          key={i}
                          cx={i * 20}
                          cy={36 - ((v - min) / range) * 30 + 3}
                          r="2.5"
                          fill={tierStyle.text}
                          opacity={i === sparkData.length - 1 ? 1 : 0.4}
                        />
                      ))}
                    </>
                  )
                })()}
              </svg>
            ) : (
              <p className="text-[10px]" style={{ color: tierStyle.text, opacity: 0.5 }}>
                Play more matches to see your trend
              </p>
            )}
          </div>

          {/* Tier badge */}
          <div className="text-center shrink-0">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: tierStyle.text }}>
              {skillTier}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: tierStyle.text, opacity: 0.6 }}>Tier</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{totalWins}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Wins</p>
        </div>
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{winRate}%</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Win Rate</p>
        </div>
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{totalMatches}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Matches</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden border border-white/10 glass">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400 hover:text-white'
              }`}
            >
              {tab === 'Matches' && <Trophy size={12} />}
              {tab === 'Posts' && <MessageSquare size={12} />}
              {tab === 'ELO' && <TrendingUp size={12} />}
              {tab}
              {tab !== 'ELO' && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'
                }`}>
                  {tab === 'Matches' ? totalMatches : posts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'Matches' && (
          games.length === 0 ? (
            <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">
              No matches yet
            </div>
          ) : (
            <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {games.map(game => <MatchRow key={game.id} game={game} />)}
            </div>
          )
        )}

        {activeTab === 'Posts' && (
          posts.length === 0 ? (
            <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">
              No posts yet
            </div>
          ) : (
            <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {posts.map(post => <PostRow key={post.id} post={post} />)}
            </div>
          )
        )}

        {activeTab === 'ELO' && (
          eloHistory.length === 0 ? (
            <div className="text-center py-14 px-6">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-ink-600 text-xs font-black uppercase tracking-widest">No ELO history yet</p>
              <p className="text-ink-700 text-xs mt-2">Tag an opponent when logging a match to start tracking your ELO!</p>
            </div>
          ) : (
            <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {/* Summary row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">
                  {eloHistory.length} rated matches
                </p>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
                  <span className="text-accent">
                    +{eloHistory.filter(e => e.rating_delta > 0).reduce((s, e) => s + e.rating_delta, 0)} gained
                  </span>
                  <span className="text-spark">
                    {eloHistory.filter(e => e.rating_delta < 0).reduce((s, e) => s + e.rating_delta, 0)} lost
                  </span>
                </div>
              </div>
              {eloHistory.map((entry, i) => <EloHistoryRow key={entry.id || i} entry={entry} />)}
            </div>
          )
        )}
      </div>

      {showAvatarPicker && (
        <AvatarPicker
          currentUrl={avatarUrl}
          currentType={avatarType}
          onSave={saveAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}
