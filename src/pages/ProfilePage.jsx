import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { MapPin, Edit2, Save, X, Loader2, Camera, Check, Trophy, MessageSquare, TrendingUp, Star } from 'lucide-react'

// Colour constants so everything is explicit and dark-theme safe
const C = {
  white:      '#ffffff',
  accent:     '#c8ff00',
  spark:      '#ff4d4d',
  dim1:       'rgba(255,255,255,0.7)',
  dim2:       'rgba(255,255,255,0.5)',
  dim3:       'rgba(255,255,255,0.35)',
  dim4:       'rgba(255,255,255,0.2)',
  surface:    'rgba(255,255,255,0.04)',
  surfaceHov: 'rgba(255,255,255,0.07)',
  border:     'rgba(255,255,255,0.1)',
  borderDim:  'rgba(255,255,255,0.06)',
}

const DEFAULT_AVATARS = [
  { id: 'avatar-1', src: '/avatars/avatar-1.jpeg', label: 'Badminton M'    },
  { id: 'avatar-2', src: '/avatars/avatar-2.jpeg', label: 'Badminton F'    },
  { id: 'avatar-3', src: '/avatars/avatar-3.jpeg', label: 'Tennis M'       },
  { id: 'avatar-4', src: '/avatars/avatar-4.jpeg', label: 'Tennis F'       },
  { id: 'avatar-5', src: '/avatars/avatar-5.jpeg', label: 'Pickleball M'   },
  { id: 'avatar-6', src: '/avatars/avatar-6.jpeg', label: 'Pickleball F'   },
  { id: 'avatar-7', src: '/avatars/avatar-7.jpeg', label: 'Table Tennis M' },
  { id: 'avatar-8', src: '/avatars/avatar-8.jpeg', label: 'Table Tennis F' },
]

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
      setSelected(publicUrl); setSelectedType('custom')
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ url: selected, type: selectedType })
    setSaving(false); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={{ background: '#0f0f1a' }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-black italic uppercase" style={{ color: C.white }}>Choose Avatar</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: C.surface }}>
            <X size={18} style={{ color: C.white }} />
          </button>
        </div>
        <div className="flex justify-center mb-5">
          {selected && selectedType !== 'initials'
            ? <img src={selected} alt="avatar" className="w-24 h-24 rounded-[1.5rem] object-cover border-2 border-accent" />
            : <div className="w-24 h-24 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl border-2 border-accent">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </div>}
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-5 text-sm font-black uppercase tracking-widest border-2 border-dashed transition-all"
          style={{ borderColor: 'rgba(200,255,0,0.4)', color: C.accent }}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Uploading...' : 'Upload My Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: C.dim2 }}>Default Avatars</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {DEFAULT_AVATARS.map(av => {
            const isSelected = selected === av.src && selectedType === 'default'
            return (
              <button key={av.id} type="button" onClick={() => { setSelected(av.src); setSelectedType('default') }}
                className="relative flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-accent' : 'border-white/10'}`}>
                  <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={11} className="text-ink-900" />
                  </div>
                )}
                <span className="text-[9px] font-bold text-center leading-tight" style={{ color: C.dim2 }}>{av.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={handleSave} disabled={saving || !selected}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-50"
          style={{ background: C.accent, color: '#0a0a0f' }}>
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
    <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: C.borderDim }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
        style={{ background: isWin ? 'rgba(200,255,0,0.1)' : 'rgba(255,77,77,0.1)' }}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: C.white }}>
          {sport?.label || game.sport}
          {game.opponent_name && <span className="font-normal" style={{ color: C.dim2 }}> vs {game.opponent_name}</span>}
        </p>
        {game.court_name && (
          <p className="text-[10px] font-bold flex items-center gap-1 mt-0.5" style={{ color: C.dim3 }}>
            <MapPin size={8} />{game.court_name}{game.city ? ` · ${game.city}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-black uppercase" style={{ color: isWin ? C.accent : C.spark }}>{isWin ? 'WIN' : 'LOSS'}</p>
        {game.score && <p className="text-[10px]" style={{ color: C.dim3 }}>{game.score}</p>}
        <p className="text-[9px] mt-0.5" style={{ color: C.dim4 }}>
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function PostRow({ post }) {
  const sport    = SPORTS.find(s => s.id === post.sport)
  const hasMedia = post.media_urls?.length > 0
  return (
    <div className="flex items-start gap-3 p-4 border-b" style={{ borderColor: C.borderDim }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ background: C.surface }}>
        {sport ? sport.emoji : '💬'}
      </div>
      <div className="flex-1 min-w-0">
        {sport && <span className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: C.accent }}>{sport.label}</span>}
        {post.content && <p className="text-sm leading-relaxed line-clamp-2" style={{ color: C.dim1 }}>{post.content}</p>}
        {hasMedia && <p className="text-[9px] font-bold mt-1" style={{ color: C.dim3 }}>📎 {post.media_urls.length} media</p>}
        {post.location_name && (
          <p className="text-[9px] font-bold flex items-center gap-1 mt-0.5" style={{ color: C.dim3 }}>
            <MapPin size={8} />{post.location_name}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-bold justify-end" style={{ color: C.dim3 }}>
          <MessageSquare size={10} />{post.comments?.length || 0}
        </div>
        <p className="text-[9px] mt-1" style={{ color: C.dim4 }}>
          {new Date(post.created_at || post.inserted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function EloRow({ sport, elo, wins, losses }) {
  const sportObj = SPORTS.find(s => s.id === sport)
  const tier = elo >= 1400 ? { label: 'Elite',    color: '#f59e0b' }
             : elo >= 1200 ? { label: 'Advanced', color: '#c8ff00' }
             : elo >= 1100 ? { label: 'Skilled',  color: '#60a5fa' }
             : elo >= 1000 ? { label: 'Ranked',   color: '#a78bfa' }
             :               { label: 'Rookie',   color: 'rgba(255,255,255,0.5)' }
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border" style={{ background: C.surface, borderColor: C.borderDim }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{sportObj?.emoji}</span>
        <div>
          <p className="text-xs font-black" style={{ color: C.white }}>{sportObj?.label}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tier.color }}>{tier.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-xl italic leading-none" style={{ color: tier.color }}>{elo}</p>
        <p className="text-[9px]" style={{ color: C.dim3 }}>{wins}W · {losses}L</p>
      </div>
    </div>
  )
}

function ReputationBadge({ label, value, emoji }) {
  const stars = Math.round(value || 0)
  return (
    <div className="flex-1 p-3 rounded-2xl border text-center" style={{ background: C.surface, borderColor: C.borderDim }}>
      <p className="text-base mb-1">{emoji}</p>
      <p className="font-display font-bold text-lg leading-none" style={{ color: C.accent }}>
        {value > 0 ? Number(value).toFixed(1) : '—'}
      </p>
      <div className="flex justify-center gap-0.5 my-1">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={8} style={{ fill: s <= stars ? C.accent : 'transparent', stroke: s <= stars ? C.accent : C.dim4 }} />
        ))}
      </div>
      <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: C.dim3 }}>{label}</p>
    </div>
  )
}

const TABS = ['Matches', 'Posts', 'Stats']

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]           = useState('Matches')
  const [games, setGames]                   = useState([])
  const [posts, setPosts]                   = useState([])
  const [eloRatings, setEloRatings]         = useState([])
  const [loading, setLoading]               = useState(true)
  const [editing, setEditing]               = useState(false)
  const [formData, setFormData]             = useState({ display_name: '', bio: '', city: '', region: '' })
  const [saving, setSaving]                 = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarUrl, setAvatarUrl]           = useState(profile?.avatar_url   || null)
  const [avatarType, setAvatarType]         = useState(profile?.avatar_type  || 'initials')
  const [saveMsg, setSaveMsg]               = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()
    if (profile) {
      setFormData({ display_name: profile.display_name || '', bio: profile.bio || '', city: profile.city || '', region: profile.region || '' })
      setAvatarUrl(profile.avatar_url || null)
      setAvatarType(profile.avatar_type || 'initials')
    }
  }, [user, profile])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadGames(), loadPosts(), loadElo()])
    setLoading(false)
  }

  async function loadGames() {
    // Query both sides: games I logged AND games where I was the tagged opponent
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .or(`user_id.eq.${user.id},tagged_opponent_id.eq.${user.id}`)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
    if (error) console.error('loadGames error:', error.message)
    setGames(data || [])
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, comments(id)')
      .eq('author_id', user.id)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
    if (error) console.error('loadPosts error:', error.message)
    setPosts(data || [])
  }

  async function loadElo() {
    const { data, error } = await supabase
      .from('player_elo')
      .select('sport, elo_rating, wins, losses, matches_played')
      .eq('user_id', user.id)
      .gte('matches_played', 1)
      .order('elo_rating', { ascending: false })
    if (error) console.error('loadElo error:', error.message)
    setEloRatings(data || [])
  }

  async function saveAvatar({ url, type }) {
    const { error } = await supabase.from('users').update({ avatar_url: url, avatar_type: type }).eq('id', user.id)
    if (!error) { setAvatarUrl(url); setAvatarType(type); refreshProfile() }
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { error } = await supabase.from('users').update({
      display_name: formData.display_name, bio: formData.bio, city: formData.city, region: formData.region,
    }).eq('id', user.id)
    if (!error) { setEditing(false); refreshProfile(); setSaveMsg('Profile updated!'); setTimeout(() => setSaveMsg(''), 3000) }
    else { setSaveMsg('Error updating profile'); setTimeout(() => setSaveMsg(''), 3000) }
    setSaving(false)
  }

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalLosses  = games.filter(g => g.result === 'loss').length
  const totalMatches = games.length
  const winRate      = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0
  const initial      = (profile?.username || 'U').charAt(0).toUpperCase()
  const hasReputation = (profile?.rating_count || 0) > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: C.accent }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0a0a0f' }}>
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: C.white }}>My Profile</h1>
      </div>

      {/* Avatar + identity */}
      <div className="px-5 pb-4">
        <div className="relative w-20 h-20 mb-3">
          {avatarUrl && avatarType !== 'initials'
            ? <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-[1.5rem] object-cover" />
            : <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">{initial}</div>}
          <button onClick={() => setShowAvatarPicker(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-ink-900"
            style={{ background: C.accent }}>
            <Camera size={13} className="text-ink-900" />
          </button>
        </div>

        {!editing ? (
          <>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter" style={{ color: C.white }}>
                {profile?.display_name || `@${profile?.username}`}
              </h1>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-white/10">
                <Edit2 size={14} style={{ color: C.dim2 }} />
              </button>
            </div>
            <p className="text-sm font-bold mt-0.5" style={{ color: C.accent }}>@{profile?.username}</p>
            {(profile?.city || profile?.region) && (
              <div className="flex items-center gap-1.5 text-xs font-bold mt-1.5" style={{ color: C.dim2 }}>
                <MapPin size={11} style={{ color: C.accent }} />
                {[profile?.city, profile?.region].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.bio && <p className="text-sm mt-3 leading-relaxed max-w-sm" style={{ color: C.dim1 }}>{profile.bio}</p>}
            {saveMsg && <p className="text-xs font-bold mt-2" style={{ color: saveMsg.includes('Error') ? C.spark : C.accent }}>{saveMsg}</p>}
          </>
        ) : (
          <div className="space-y-3 mt-2">
            {[
              { key: 'display_name', placeholder: 'Display name' },
              { key: 'city',         placeholder: 'City'         },
              { key: 'region',       placeholder: 'Region/Province' },
            ].map(({ key, placeholder }) => (
              <input key={key} type="text" value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none"
                style={{ background: C.surface, borderColor: C.border, color: C.white }} />
            ))}
            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Bio" rows={3}
              className="w-full px-4 py-3 rounded-xl border focus:outline-none resize-none"
              style={{ background: C.surface, borderColor: C.border, color: C.white }} />
            {saveMsg && <p className="text-xs font-bold" style={{ color: saveMsg.includes('Error') ? C.spark : C.accent }}>{saveMsg}</p>}
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} disabled={saving}
                className="flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: C.accent, color: '#0a0a0f' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl font-bold text-sm"
                style={{ background: C.surface, color: C.dim2 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        {[
          { val: totalWins,     label: 'Wins'     },
          { val: `${winRate}%`, label: 'Win Rate' },
          { val: totalMatches,  label: 'Matches'  },
        ].map(({ val, label }) => (
          <div key={label} className="p-3.5 rounded-[1.25rem] border text-center glass" style={{ borderColor: C.borderDim }}>
            <p className="font-display text-2xl font-bold italic" style={{ color: C.accent }}>{val}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: C.dim3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Win/loss bar — only shown when there are matches */}
      {totalMatches > 0 && (
        <div className="px-4 mb-5">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surface }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${winRate}%`, background: C.accent }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-black uppercase" style={{ color: C.accent }}>{totalWins}W</span>
            <span className="text-[9px] font-black uppercase" style={{ color: C.spark }}>{totalLosses}L</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden border glass" style={{ borderColor: C.border }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
              style={activeTab === tab ? { background: C.accent, color: '#0a0a0f' } : { color: C.dim2 }}>
              {tab === 'Matches' && <Trophy size={12} />}
              {tab === 'Posts'   && <MessageSquare size={12} />}
              {tab === 'Stats'   && <TrendingUp size={12} />}
              {tab}
              {tab === 'Matches' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={activeTab === tab ? { background: 'rgba(10,10,15,0.2)', color: '#0a0a0f' } : { background: C.surface, color: C.dim3 }}>
                  {totalMatches}
                </span>
              )}
              {tab === 'Posts' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={activeTab === tab ? { background: 'rgba(10,10,15,0.2)', color: '#0a0a0f' } : { background: C.surface, color: C.dim3 }}>
                  {posts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'Matches' && (
          games.length === 0
            ? <div className="text-center py-14 text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No matches yet</div>
            : <div className="rounded-[2rem] border overflow-hidden glass" style={{ borderColor: C.border }}>
                {games.map(g => <MatchRow key={g.id} game={g} />)}
              </div>
        )}

        {activeTab === 'Posts' && (
          posts.length === 0
            ? <div className="text-center py-14 text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No posts yet</div>
            : <div className="rounded-[2rem] border overflow-hidden glass" style={{ borderColor: C.border }}>
                {posts.map(p => <PostRow key={p.id} post={p} />)}
              </div>
        )}

        {activeTab === 'Stats' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} style={{ color: C.accent }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>ELO Ratings</p>
              </div>
              {eloRatings.length === 0 ? (
                <div className="rounded-2xl border p-5 text-center glass" style={{ borderColor: C.border }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No ELO yet</p>
                  <p className="text-xs mt-1" style={{ color: C.dim4 }}>Log a match with a tagged opponent to earn your rating</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eloRatings.map(r => <EloRow key={r.sport} sport={r.sport} elo={r.elo_rating} wins={r.wins} losses={r.losses} />)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={13} style={{ color: C.accent }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.dim2 }}>
                  Reputation
                  {hasReputation && <span className="ml-2" style={{ color: C.dim3 }}>· {profile.rating_count} rating{profile.rating_count !== 1 ? 's' : ''}</span>}
                </p>
              </div>
              {!hasReputation ? (
                <div className="rounded-2xl border p-5 text-center glass" style={{ borderColor: C.border }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.dim3 }}>No ratings yet</p>
                  <p className="text-xs mt-1" style={{ color: C.dim4 }}>Play matches and get rated by your opponents</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <ReputationBadge label="Skill"         value={profile.avg_skill}         emoji="🎯" />
                  <ReputationBadge label="Sportsmanship" value={profile.avg_sportsmanship}  emoji="🤝" />
                  <ReputationBadge label="Reliability"   value={profile.avg_reliability}    emoji="⏰" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAvatarPicker && (
        <AvatarPicker currentUrl={avatarUrl} currentType={avatarType} onSave={saveAvatar} onClose={() => setShowAvatarPicker(false)} />
      )}
    </div>
  )
}
