import { useEffect, useState, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Trophy, MapPin, Edit3, Loader2, X,
  Heart, MessageCircle, Image, Calendar, Clock, Pencil, Trash2,
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
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:border-accent/50 focus:outline-none placeholder:text-ink-700"
              placeholder="e.g. NCR, Region IV-A…"
              value={form.region}
              onChange={e => setForm({ ...form, region: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">City / Municipality</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:border-accent/50 focus:outline-none placeholder:text-ink-700"
              placeholder="e.g. Makati, Quezon City…"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
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

// ─── Edit Match Modal ─────────────────────────────────────────
function EditMatchModal({ game, onClose, onSaved }) {
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    score:         game.score         || '',
    result:        game.result        || 'win',
    opponent_name: game.opponent_name || '',
    court_name:    game.court_name    || '',
    intensity:     game.intensity     || 'Med',
  })

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('games')
      .update({ ...form, edited_at: new Date().toISOString() })
      .eq('id', game.id)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await onSaved()
    onClose()
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-accent/50 focus:outline-none"

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
      <div className="w-full bg-ink-800 rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-lg font-bold italic uppercase tracking-tighter text-white">Edit Match</h2>
          <button onClick={onClose} className="p-2 glass rounded-xl border border-white/10 text-ink-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          {/* Result */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-2 block">Result</label>
            <div className="grid grid-cols-2 gap-2">
              {['win', 'loss'].map(r => (
                <button key={r} type="button" onClick={() => setForm({ ...form, result: r })}
                  className="py-3 rounded-2xl font-black uppercase text-sm border-2 transition-all"
                  style={form.result === r
                    ? r === 'win'
                      ? { borderColor: '#c8ff00', color: '#c8ff00', background: 'rgba(200,255,0,0.08)' }
                      : { borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255,77,77,0.08)' }
                    : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)' }
                  }>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Score</label>
            <input className={inputCls} placeholder="e.g. 21-18, 21-15"
              value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
          </div>

          {/* Opponent */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Opponent</label>
            <input className={inputCls} placeholder="Opponent name"
              value={form.opponent_name} onChange={e => setForm({ ...form, opponent_name: e.target.value })} />
          </div>

          {/* Court */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-1.5 block">Court / Venue</label>
            <input className={inputCls} placeholder="Court or venue name"
              value={form.court_name} onChange={e => setForm({ ...form, court_name: e.target.value })} />
          </div>

          {/* Intensity */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-ink-500 mb-2 block">Intensity</label>
            <div className="flex gap-2">
              {[
                { lvl: 'Low',  style: { background: 'rgba(59,130,246,0.15)', borderColor: '#60a5fa', color: '#93c5fd' } },
                { lvl: 'Med',  style: { background: 'rgba(234,179,8,0.15)',  borderColor: '#facc15', color: '#fde68a' } },
                { lvl: 'High', style: { background: 'rgba(239,68,68,0.15)',  borderColor: '#f87171', color: '#fca5a5' } },
              ].map(({ lvl, style }) => (
                <button key={lvl} type="button" onClick={() => setForm({ ...form, intensity: lvl })}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase border-2 transition-all"
                  style={form.intensity === lvl ? style : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl text-base italic uppercase tracking-tight glow-accent disabled:opacity-50 mt-2">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Match log row ────────────────────────────────────────────
function MatchRow({ game, onRefresh }) {
  const sport                         = SPORTS.find(s => s.id === game.sport)
  const isWin                         = game.result === 'win'
  const [showEdit, setShowEdit]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [deleting, setDeleting]       = useState(false)

  async function deleteMatch() {
    setDeleting(true)
    await supabase.from('games').delete().eq('id', game.id)
    setDeleting(false)
    setConfirmDel(false)
    onRefresh?.()
  }

  return (
    <>
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
            {game.edited_at && <span className="text-[9px] text-white/20">· edited</span>}
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

        {/* Edit / Delete actions */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button onClick={() => setShowEdit(true)}
            className="p-1.5 rounded-xl hover:bg-white/5 transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Pencil size={13} />
          </button>
          <button onClick={() => setConfirmDel(true)}
            className="p-1.5 rounded-xl hover:bg-red-500/10 transition-all"
            style={{ color: 'rgba(255,77,77,0.5)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="mx-4 mb-2 p-4 rounded-2xl border" style={{ background: 'rgba(255,77,77,0.08)', borderColor: 'rgba(255,77,77,0.2)' }}>
          <p className="text-sm text-white font-bold mb-1">Delete this match?</p>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDel(false)}
              className="flex-1 py-2 rounded-xl text-xs font-black uppercase border border-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancel
            </button>
            <button onClick={deleteMatch} disabled={deleting}
              className="flex-1 py-2 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50"
              style={{ background: '#ff4d4d' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditMatchModal
          game={game}
          onClose={() => setShowEdit(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  )
}

// ─── Event mini card ─────────────────────────────────────────
function EventMiniCard({ event, badge, badgeColor }) {
  const typeBar = { tournament: '#FF4D00', open_play: '#c8ff00', clinic: '#60A5FA' }[event.event_type] || '#fff'
  const dateStr = event.date_start
    ? new Date(event.date_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const timeStr = event.date_start
    ? new Date(event.date_start).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''
  const isPast = event.date_start && new Date(event.date_start) < new Date()

  return (
    <div className="rounded-[1.75rem] border border-white/8 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', opacity: isPast ? 0.6 : 1 }}>
      <div className="h-1.5 w-full" style={{ background: typeBar }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-black text-sm text-white leading-tight flex-1">{event.title}</h3>
          <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0"
            style={{ background: `${badgeColor}18`, color: badgeColor }}>
            {isPast ? 'Past' : badge}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Calendar size={10} />
            {dateStr}{timeStr && ` · ${timeStr}`}
          </div>
          {(event.venue || event.city) && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <MapPin size={10} />
              {event.venue}{event.city ? ` · ${event.city}` : ''}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Trophy size={10} />
            {event.event_type?.replace('_', ' ')} · {event.max_slots} slots
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const TABS = ['Posts', 'Match Logs', 'Hosting', 'Going']

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [games, setGames]             = useState([])
  const [posts, setPosts]             = useState([])
  const [hostingEvents, setHosting]   = useState([])
  const [goingEvents, setGoing]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('Posts')
  const [showEdit, setShowEdit]       = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: g }, { data: p }, { data: h }, { data: regs }] = await Promise.all([
      supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('posts').select('*, author:users!posts_author_id_fkey(id,username), likes(user_id), comments(*, users(username))').eq('author_id', user.id).order('inserted_at', { ascending: false }),
      // Events I'm hosting
      supabase.from('events').select('*').eq('host_id', user.id).order('date_start', { ascending: true }),
      // Events I registered for
      supabase.from('event_registrations').select('event_id, events(*)').eq('user_id', user.id),
    ])
    setGames(g || [])
    setPosts(p || [])
    setHosting(h || [])
    setGoing((regs || []).map(r => r.events).filter(Boolean).sort((a, b) => new Date(a.date_start) - new Date(b.date_start)))
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
              {tab === 'Posts'      && <Image size={12} />}
              {tab === 'Match Logs' && <Calendar size={12} />}
              {tab === 'Hosting'    && <Trophy size={12} />}
              {tab === 'Going'      && <Clock size={12} />}
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
              {games.map(game => <MatchRow key={game.id} game={game} onRefresh={fetchData} />)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Hosting' && (
        <div className="px-4 space-y-3">
          {hostingEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-ink-500 font-black uppercase text-xs tracking-widest">No events hosted yet</p>
              <p className="text-ink-700 text-xs mt-1">Tap Host on the Events page to create one</p>
            </div>
          ) : (
            hostingEvents.map(ev => <EventMiniCard key={ev.id} event={ev} badge="Hosting" badgeColor="#c8ff00" />)
          )}
        </div>
      )}

      {activeTab === 'Going' && (
        <div className="px-4 space-y-3">
          {goingEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-ink-500 font-black uppercase text-xs tracking-widest">Not registered for any events</p>
              <p className="text-ink-700 text-xs mt-1">Browse events and register to see them here</p>
            </div>
          ) : (
            goingEvents.map(ev => <EventMiniCard key={ev.id} event={ev} badge="Going" badgeColor="#60a5fa" />)
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
