import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS, REGIONS, CITIES_BY_REGION } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Trophy, MapPin, Edit3, Loader2, X,
  Heart, MessageCircle, Image, Calendar,
} from 'lucide-react'
import PostCard from '../components/PostCard'

// ─── Edit Profile Modal ───────────────────────────────────────
function EditProfileModal({ profile, onClose, onSaved }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    username:     profile?.username     || '',
    display_name: profile?.display_name || '',
    bio:          profile?.bio          || '',
    region:       profile?.region       || '',
    city:         profile?.city         || '',
  })

  const cities = form.region ? (CITIES_BY_REGION[form.region] || []) : []

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('users').update(form).eq('id', user.id)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
      <div className="w-full bg-ink-800 rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold italic uppercase tracking-tighter text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 glass rounded-xl border border-white/10 text-ink-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Username</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:border-accent/50 focus:outline-none"
              placeholder="@username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Display Name</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:border-accent/50 focus:outline-none"
              placeholder="Your name"
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Bio</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:border-accent/50 focus:outline-none resize-none"
              placeholder="Tell the community about yourself…"
              rows={3}
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Region</label>
            <select
              className="w-full bg-ink-900 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none appearance-none"
              value={form.region}
              onChange={e => setForm({ ...form, region: e.target.value, city: '' })}
            >
              <option value="">Select region…</option>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">City / Municipality</label>
            <select
              className="w-full bg-ink-900 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none appearance-none disabled:opacity-40"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              disabled={!form.region}
            >
              <option value="">Select city…</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl text-base italic uppercase tracking-tight glow-accent disabled:opacity-50 mt-2"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Match log row ────────────────────────────────────────────
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
          {game.opponent_name ? <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span> : ''}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {game.court_name && (
            <span className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5">
              <MapPin size={8} />{game.court_name}
            </span>
          )}
          {game.city && <span className="text-[9px] text-ink-600">· {game.city}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>
          {isWin ? 'WIN' : 'LOSS'}
        </p>
        {game.score && <p className="text-[10px] text-ink-500 font-bold">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const TABS = ['Posts', 'Match Logs']

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [games, setGames]       = useState([])
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('Posts')
  const [showEdit, setShowEdit] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('posts')
        .select('*, users(id,username), likes(user_id), comments(*, users(username))')
        .eq('user_id', user.id)
        .order('inserted_at', { ascending: false }),
    ])
    setGames(g || [])
    setPosts(p || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Per-sport stats
  const sportStats = SPORTS.map(s => {
    const sg   = games.filter(g => g.sport === s.id)
    const wins = sg.filter(g => g.result === 'win').length
    return { ...s, total: sg.length, wins, rate: sg.length ? Math.round(wins / sg.length * 100) : 0 }
  }).filter(s => s.total > 0)

  const totalWins    = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate      = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0

  const username = profile?.username || profile?.display_name || 'Player'
  const initial  = username.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">

      {/* ── Cover banner ── */}
      <div className="relative h-36 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 overflow-hidden">
        {/* Subtle court-line decoration */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(#C8FF00 1px,transparent 1px),linear-gradient(90deg,#C8FF00 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-ink-900 to-transparent" />
      </div>

      {/* ── Avatar + name block ── */}
      <div className="px-5 pb-4 relative -mt-12">
        <div className="flex items-end justify-between mb-3">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl border-4 border-ink-900 glow-accent">
            {initial}
          </div>

          {/* Edit Profile button */}
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-4 py-2.5 glass rounded-2xl border border-white/15 text-ink-200 text-xs font-black uppercase tracking-widest hover:border-accent/40 hover:text-accent transition-all"
          >
            <Edit3 size={13} />
            Edit Profile
          </button>
        </div>

        {/* Name / handle */}
        <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter text-white leading-none">
          {profile?.display_name || `@${username}`}
        </h1>
        <p className="text-accent text-sm font-bold mt-0.5">@{profile?.username || '—'}</p>

        {/* Location */}
        {(profile?.city || profile?.region) && (
          <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-1.5">
            <MapPin size={11} className="text-accent" />
            {[profile.city, profile.region].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Bio */}
        {profile?.bio && (
          <p className="text-ink-300 text-sm mt-3 leading-relaxed max-w-sm">{profile.bio}</p>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        {[
          { num: totalWins,      lbl: 'Wins'     },
          { num: `${winRate}%`,  lbl: 'Win Rate' },
          { num: totalMatches,   lbl: 'Matches'  },
        ].map(s => (
          <div key={s.lbl} className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
            <p className="font-display text-2xl font-bold text-accent italic leading-none">{s.num}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* ── Per-sport win bars ── */}
      {sportStats.length > 0 && (
        <div className="px-4 mb-5">
          <div className="glass p-5 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-ink-500">Sport Breakdown</p>
            </div>
            <div className="space-y-4">
              {sportStats.map(s => (
                <div key={s.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">{s.emoji} {s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-ink-600 font-bold">{s.wins}W · {s.total - s.wins}L</span>
                      <span className="text-accent font-black text-sm">{s.rate}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${s.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="px-4 mb-4">
        <div className="glass flex rounded-2xl overflow-hidden border border-white/10">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab ? 'bg-accent text-ink-900' : 'text-ink-500 hover:text-ink-200'
              }`}
            >
              {tab === 'Posts'       && <Image size={12} />}
              {tab === 'Match Logs'  && <Calendar size={12} />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'Posts' && (
        <div className="px-4 space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📸</p>
              <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No posts yet</p>
              <p className="text-ink-700 text-xs mt-1">Log a match to auto-post to the feed</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onRefresh={fetchData} />
            ))
          )}
        </div>
      )}

      {activeTab === 'Match Logs' && (
        <div className="px-4">
          {games.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🏸</p>
              <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No matches logged yet</p>
            </div>
          ) : (
            <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
              {games.map(game => <MatchRow key={game.id} game={game} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Sign out ── */}
      <div className="px-4 mt-10">
        <button
          onClick={signOut}
          className="w-full py-4 glass rounded-2xl text-spark font-black text-xs uppercase tracking-widest border border-spark/20 hover:bg-spark/5 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* ── Edit modal ── */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={refreshProfile}
        />
      )}
    </div>
  )
}
