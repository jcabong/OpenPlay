import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { MapPin, Edit2, Save, X, Loader2, Camera, Check, Trophy, MessageSquare, Star } from 'lucide-react'

const DEFAULT_AVATARS = [
  { id: 'avatar-1', src: '/avatars/avatar-1.jpeg', label: 'Badminton M'   },
  { id: 'avatar-2', src: '/avatars/avatar-2.jpeg', label: 'Badminton F'   },
  { id: 'avatar-3', src: '/avatars/avatar-3.jpeg', label: 'Tennis M'      },
  { id: 'avatar-4', src: '/avatars/avatar-4.jpeg', label: 'Tennis F'      },
  { id: 'avatar-5', src: '/avatars/avatar-5.jpeg', label: 'Pickleball M'  },
  { id: 'avatar-6', src: '/avatars/avatar-6.jpeg', label: 'Pickleball F'  },
  { id: 'avatar-7', src: '/avatars/avatar-7.jpeg', label: 'Table Tennis M'},
  { id: 'avatar-8', src: '/avatars/avatar-8.jpeg', label: 'Table Tennis F'},
]

const TIER_STYLE = {
  Diamond:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)'  },
  Platinum: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)' },
  Gold:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.25)'  },
  Silver:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
  Bronze:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.20)'  },
  Casual:   { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
}

function tierStyle(tier) { return TIER_STYLE[tier] || TIER_STYLE.Casual }

// ─── Avatar Picker ────────────────────────────────────────────────────────────
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
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-5 text-sm font-black uppercase tracking-widest border-2 border-dashed"
          style={{ borderColor: 'rgba(200,255,0,0.4)', color: '#c8ff00' }}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Uploading...' : 'Upload My Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Default Avatars</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {DEFAULT_AVATARS.map(av => {
            const isSel = selected === av.src && selectedType === 'default'
            return (
              <button key={av.id} type="button" onClick={() => { setSelected(av.src); setSelectedType('default') }}
                className="relative flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isSel ? 'border-accent' : 'border-white/10'}`}>
                  <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
                </div>
                {isSel && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={11} className="text-ink-900" />
                  </div>
                )}
                <span className="text-[9px] text-ink-500 font-bold text-center leading-tight">{av.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={handleSave} disabled={saving || !selected}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-50"
          style={{ background: '#c8ff00', color: '#0a0a0f' }}>
          {saving ? 'Saving...' : 'Save Avatar'}
        </button>
      </div>
    </div>
  )
}

// ─── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({ game }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-red-500/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-100 truncate">
          {sport?.label}
          {game.opponent_name && <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>}
        </p>
        {(game.court_name || game.city) && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{[game.court_name, game.city].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-red-400'}`}>{isWin ? 'WIN' : 'LOSS'}</p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

// ─── Post Row ─────────────────────────────────────────────────────────────────
function PostRow({ post }) {
  const sport    = SPORTS.find(s => s.id === post.sport)
  const hasMedia = post.media_urls?.length > 0
  const dateVal  = post.inserted_at || post.created_at
  return (
    <div className="flex items-start gap-3 p-4 border-b border-white/5 last:border-none">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 bg-white/5">
        {sport ? sport.emoji : '💬'}
      </div>
      <div className="flex-1 min-w-0">
        {sport && <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 block">{sport.label}</span>}
        {post.content && <p className="text-sm text-ink-200 leading-relaxed line-clamp-2">{post.content}</p>}
        {hasMedia && <p className="text-[9px] text-ink-600 font-bold mt-1">📎 {post.media_urls.length} media attached</p>}
        {post.location_name && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{post.location_name}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-ink-600 text-[10px] font-bold justify-end">
          <MessageSquare size={10} />{post.comments?.length || 0}
        </div>
        <p className="text-[9px] text-ink-700 mt-1">
          {dateVal ? new Date(dateVal).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
        </p>
      </div>
    </div>
  )
}

// ─── ELO Sport Card ───────────────────────────────────────────────────────────
function EloSportCard({ sportId, eloRows }) {
  const sport = SPORTS.find(s => s.id === sportId)
  const row   = eloRows.find(r => r.sport === sportId)
  if (!row) return (
    <div className="glass p-3 rounded-2xl border border-white/5 text-center opacity-40">
      <p className="text-lg mb-1">{sport?.emoji || '🏸'}</p>
      <p className="text-[9px] font-black uppercase text-ink-600">{sport?.label}</p>
      <p className="text-[10px] text-ink-700 mt-1">Unranked</p>
    </div>
  )
  const ts = tierStyle(row.skill_tier)
  return (
    <div className="p-3 rounded-2xl border text-center transition-all"
      style={{ background: ts.bg, borderColor: ts.border }}>
      <p className="text-lg mb-0.5">{sport?.emoji || '🏸'}</p>
      <p className="font-display text-xl font-bold italic" style={{ color: ts.color }}>{row.elo_rating}</p>
      <p className="text-[8px] font-black uppercase tracking-wider mt-0.5" style={{ color: ts.color, opacity: 0.8 }}>
        {row.skill_tier}
      </p>
      <p className="text-[9px] text-ink-600 mt-1">{row.wins}W · {row.losses}L</p>
    </div>
  )
}

// ─── Star Display ─────────────────────────────────────────────────────────────
function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={10}
          style={{ fill: s <= Math.round(value) ? '#c8ff00' : 'transparent', stroke: s <= Math.round(value) ? '#c8ff00' : 'rgba(255,255,255,0.2)' }} />
      ))}
    </div>
  )
}

const TABS = ['Matches', 'Posts']

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab]               = useState('Matches')
  const [games, setGames]                       = useState([])
  const [posts, setPosts]                       = useState([])
  const [eloRows, setEloRows]                   = useState([])
  const [loading, setLoading]                   = useState(true)
  const [editing, setEditing]                   = useState(false)
  const [formData, setFormData]                 = useState({ display_name: '', bio: '', city: '', province: '', region: '' })
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
        province:     profile.province     || '',
        region:       profile.region       || '',
      })
      setAvatarUrl(profile.avatar_url   || null)
      setAvatarType(profile.avatar_type || 'initials')
    }
  }, [user, profile])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadGames(), loadPosts(), loadElo()])
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
      .order('inserted_at', { ascending: false })
    setPosts(data || [])
  }

  async function loadElo() {
    const { data } = await supabase
      .from('player_elo')
      .select('sport, elo_rating, wins, losses, matches_played, skill_tier')
      .eq('user_id', user.id)
    setEloRows(data || [])
  }

  async function saveAvatar({ url, type }) {
    const { error } = await supabase.from('users').update({ avatar_url: url, avatar_type: type }).eq('id', user.id)
    if (!error) { setAvatarUrl(url); setAvatarType(type); refreshProfile() }
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { error } = await supabase.from('users').update({
      display_name: formData.display_name,
      bio:          formData.bio,
      city:         formData.city,
      province:     formData.province,
      region:       formData.region,
    }).eq('id', user.id)
    if (!error) {
      setEditing(false); refreshProfile()
      setSaveMsg('Profile updated!'); setTimeout(() => setSaveMsg(''), 3000)
    } else {
      setSaveMsg('Error updating profile'); setTimeout(() => setSaveMsg(''), 3000)
    }
    setSaving(false)
  }

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalLosses  = games.filter(g => g.result === 'loss').length
  const totalMatches = games.length
  const winRate      = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0
  const initial      = (profile?.username || 'U').charAt(0).toUpperCase()
  const hasAvatar    = avatarUrl && avatarType !== 'initials'

  if (loading) return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center">
      <Loader2 className="animate-spin text-accent" size={28} />
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">My Profile</h1>
      </div>

      {/* Avatar + identity */}
      <div className="px-5 pb-4">
        <div className="relative w-20 h-20 mb-3">
          {hasAvatar
            ? <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-[1.5rem] object-cover" />
            : <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl">{initial}</div>
          }
          <button onClick={() => setShowAvatarPicker(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-ink-900"
            style={{ background: '#c8ff00' }}>
            <Camera size={13} className="text-ink-900" />
          </button>
        </div>

        {!editing ? (
          <>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter text-white">
                {profile?.display_name || `@${profile?.username}`}
              </h1>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-white/10">
                <Edit2 size={14} className="text-ink-500" />
              </button>
            </div>
            <p className="text-accent text-sm font-bold mt-0.5">@{profile?.username}</p>
            {(profile?.city || profile?.province || profile?.region) && (
              <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-1.5">
                <MapPin size={11} className="text-accent" />
                {[profile?.city, profile?.province || profile?.region].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.bio && <p className="text-ink-300 text-sm mt-3 leading-relaxed max-w-sm">{profile.bio}</p>}

            {/* Community ratings */}
            {profile?.rating_count > 0 && (
              <div className="mt-3 flex items-center gap-4 p-3 rounded-2xl border border-white/8"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-ink-600 mb-1">Skill</p>
                  <StarDisplay value={profile.avg_skill || 0} />
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-ink-600 mb-1">Sportsmanship</p>
                  <StarDisplay value={profile.avg_sportsmanship || 0} />
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-ink-600 mb-1">Reliability</p>
                  <StarDisplay value={profile.avg_reliability || 0} />
                </div>
                <p className="text-[9px] text-ink-600 ml-auto">{profile.rating_count} ratings</p>
              </div>
            )}

            {saveMsg && (
              <p className={`text-xs font-bold mt-2 ${saveMsg.includes('Error') ? 'text-red-400' : 'text-accent'}`}>{saveMsg}</p>
            )}
          </>
        ) : (
          <div className="space-y-3 mt-2">
            {[
              { key: 'display_name', placeholder: 'Display name' },
              { key: 'city',         placeholder: 'City' },
              { key: 'province',     placeholder: 'Province' },
              { key: 'region',       placeholder: 'Region (optional)' },
            ].map(({ key, placeholder }) => (
              <input key={key} type="text" value={formData[key]} placeholder={placeholder}
                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white" />
            ))}
            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Bio" rows={3}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white resize-none" />
            {saveMsg && (
              <p className={`text-xs font-bold ${saveMsg.includes('Error') ? 'text-red-400' : 'text-accent'}`}>{saveMsg}</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-accent text-ink-900 font-bold text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-white/5 text-ink-400 font-bold text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        <div className="glass p-3 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{totalWins}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-ink-600 mt-1">Wins</p>
        </div>
        <div className="glass p-3 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-red-400 italic">{totalLosses}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-ink-600 mt-1">Losses</p>
        </div>
        <div className="glass p-3 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{winRate}%</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-ink-600 mt-1">Win Rate</p>
        </div>
      </div>

      {/* Per-sport ELO grid */}
      <div className="px-4 mb-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3 flex items-center gap-2">
          <Trophy size={11} className="text-accent" /> ELO by Sport
        </p>
        <div className="grid grid-cols-4 gap-2">
          {SPORTS.map(s => <EloSportCard key={s.id} sportId={s.id} eloRows={eloRows} />)}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden border border-white/10 glass">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-400 hover:text-white'
              }`}>
              {tab === 'Matches' ? <Trophy size={12} /> : <MessageSquare size={12} />}
              {tab}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? 'bg-ink-900/20 text-ink-900' : 'bg-white/10 text-ink-500'
              }`}>
                {tab === 'Matches' ? totalMatches : posts.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'Matches' && (
          games.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No matches yet</div>
            : <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
                {games.map(g => <MatchRow key={g.id} game={g} />)}
              </div>
        )}
        {activeTab === 'Posts' && (
          posts.length === 0
            ? <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">No posts yet</div>
            : <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
                {posts.map(p => <PostRow key={p.id} post={p} />)}
              </div>
        )}
      </div>

      {showAvatarPicker && (
        <AvatarPicker currentUrl={avatarUrl} currentType={avatarType} onSave={saveAvatar} onClose={() => setShowAvatarPicker(false)} />
      )}
    </div>
  )
}
