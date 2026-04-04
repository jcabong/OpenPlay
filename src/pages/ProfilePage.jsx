import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Calendar, Edit2, Save, X, Loader2 } from 'lucide-react'

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
          {game.opponent_name && (
            <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>
          )}
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

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    city: '',
    region: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadGames()
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
      })
    }
  }, [user, profile])

  async function loadGames() {
    setLoading(true)
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    setGames(data || [])
    setLoading(false)
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        display_name: formData.display_name,
        bio: formData.bio,
        city: formData.city,
        region: formData.region,
      })
      .eq('id', user.id)
    
    if (!error) {
      setEditing(false)
      alert('Profile updated!')
      window.location.reload()
    } else {
      alert('Error updating profile')
    }
    setSaving(false)
  }

  const totalWins = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  const initial = (profile?.username || 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">My Profile</h1>
      </div>

      <div className="px-5 pb-4">
        <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl mb-3">
          {initial}
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
            {(profile?.city || profile?.region) && (
              <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-1.5">
                <MapPin size={11} className="text-accent" />
                {[profile?.city, profile?.region].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.bio && (
              <p className="text-ink-300 text-sm mt-3 leading-relaxed max-w-sm">{profile?.bio}</p>
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
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2 rounded-xl bg-accent text-ink-900 font-bold text-sm flex items-center justify-center gap-2">
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

      <div className="px-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-accent" />
          Match History
        </h2>
        {games.length === 0 ? (
          <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">
            No matches yet
          </div>
        ) : (
          <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
            {games.map(game => (
              <MatchRow key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}