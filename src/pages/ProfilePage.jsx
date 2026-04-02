import { useEffect, useState } from 'react'
import { supabase, SPORTS, REGIONS, CITIES_BY_REGION } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, MapPin, Edit3, Check, Loader2, ChevronDown } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [games, setGames]     = useState([])
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [editForm, setEditForm] = useState({
    username:     '',
    display_name: '',
    bio:          '',
    region:       '',
    city:         '',
  })

  useEffect(() => { if (user) fetchData() }, [user])

  useEffect(() => {
    if (profile) {
      setEditForm({
        username:     profile.username     || '',
        display_name: profile.display_name || '',
        bio:          profile.bio          || '',
        region:       profile.region       || '',
        city:         profile.city         || '',
      })
    }
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('posts').select('*, likes(user_id), comments(id)').eq('user_id', user.id).order('inserted_at', { ascending: false }).limit(20),
    ])
    setGames(g || [])
    setPosts(p || [])
    setLoading(false)
  }

  async function saveProfile() {
    setSavingProfile(true)
    const { error } = await supabase.from('users').update(editForm).eq('id', user.id)
    if (!error) { await refreshProfile(); setEditing(false) }
    else alert('Error saving: ' + error.message)
    setSavingProfile(false)
  }

  const cities = editForm.region ? (CITIES_BY_REGION[editForm.region] || []) : []

  // Per-sport stats
  const sportStats = SPORTS.map(s => {
    const sg = games.filter(g => g.sport === s.id)
    const wins = sg.filter(g => g.result === 'win').length
    return { ...s, total: sg.length, wins, rate: sg.length ? Math.round(wins / sg.length * 100) : 0 }
  }).filter(s => s.total > 0)

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate      = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0
  const initial      = (profile?.username || profile?.display_name || 'U').charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">

      {/* Hero */}
      <div className="flex flex-col items-center px-6 pt-14 pb-6 relative">
        <button
          onClick={() => setEditing(!editing)}
          className="absolute top-14 right-5 p-2 glass rounded-xl border border-white/10 text-ink-500 hover:text-accent transition-colors"
        >
          {editing ? <Check size={18} /> : <Edit3 size={18} />}
        </button>

        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl mb-4 glow-accent">
          {initial}
        </div>

        {editing ? (
          <div className="w-full max-w-sm space-y-2 mb-4">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-accent/50 focus:outline-none text-center"
              placeholder="@username"
              value={editForm.username}
              onChange={e => setEditForm({ ...editForm, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-accent/50 focus:outline-none text-center"
              placeholder="Display name"
              value={editForm.display_name}
              onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
            />
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-accent/50 focus:outline-none resize-none"
              placeholder="Bio..."
              rows={2}
              value={editForm.bio}
              onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
            />
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none appearance-none"
              value={editForm.region}
              onChange={e => setEditForm({ ...editForm, region: e.target.value, city: '' })}
            >
              <option value="" className="bg-ink-900">Select Region</option>
              {REGIONS.map(r => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
            </select>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none appearance-none disabled:opacity-40"
              value={editForm.city}
              onChange={e => setEditForm({ ...editForm, city: e.target.value })}
              disabled={!editForm.region}
            >
              <option value="" className="bg-ink-900">Select City</option>
              {cities.map(c => <option key={c} value={c} className="bg-ink-900">{c}</option>)}
            </select>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full bg-accent text-ink-900 font-display font-bold py-3 rounded-2xl glow-accent disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display font-bold uppercase italic tracking-tight mb-1">
              @{profile?.username || 'Set username'}
            </h1>
            {profile?.display_name && (
              <p className="text-ink-400 text-sm font-medium mb-1">{profile.display_name}</p>
            )}
            {(profile?.city || profile?.region) && (
              <div className="flex items-center gap-1 text-ink-600 text-xs font-bold">
                <MapPin size={11} />
                {[profile.city, profile.region].filter(Boolean).join(', ')}
              </div>
            )}
            {profile?.bio && (
              <p className="text-ink-400 text-sm text-center mt-2 max-w-xs">{profile.bio}</p>
            )}
          </>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { num: totalWins,    lbl: 'Wins'    },
          { num: `${winRate}%`, lbl: 'Win Rate' },
          { num: totalMatches, lbl: 'Matches'  },
        ].map(s => (
          <div key={s.lbl} className="glass p-4 rounded-[1.5rem] border border-white/5 text-center">
            <p className="font-display text-2xl font-bold text-accent italic">{s.num}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-0.5">{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* Per-sport stats */}
      {sportStats.length > 0 && (
        <div className="px-4 mb-4">
          <div className="glass p-5 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-ink-600">By Sport</p>
            </div>
            <div className="space-y-4">
              {sportStats.map(s => (
                <div key={s.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {s.emoji} {s.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-ink-600 font-bold">{s.wins}W / {s.total - s.wins}L</span>
                      <span className="text-accent font-black text-sm">{s.rate}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-700"
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent posts */}
      {posts.length > 0 && (
        <div className="px-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mb-3 flex items-center gap-2">
            <Clock size={10} /> Recent Activity
          </p>
          <div className="space-y-3">
            {posts.map(post => {
              const sport = SPORTS.find(s => s.id === post.sport)
              return (
                <div key={post.id} className="glass p-4 rounded-[1.5rem] border border-white/5 bg-white/[0.01]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-ink-600 text-[9px] font-black uppercase tracking-widest">
                      {new Date(post.inserted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                    {sport && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md badge-${post.sport}`}>
                        {sport.emoji}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-200 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-600 font-bold">
                    <span>♥ {post.likes?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                    {post.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin size={9} className="text-accent" /> {post.location_name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {games.length === 0 && posts.length === 0 && !loading && (
        <div className="text-center py-12 px-6">
          <p className="text-4xl mb-3">🏸</p>
          <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No activity yet</p>
          <p className="text-ink-700 text-xs mt-1">Log your first match to get started!</p>
        </div>
      )}

      <div className="px-4 mt-8">
        <button
          onClick={signOut}
          className="w-full py-4 glass rounded-2xl text-spark font-black text-xs uppercase tracking-widest border border-spark/20 hover:bg-spark/5 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
