import { useEffect, useState } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Calendar, MapPin, Users, Clock, Plus, Loader2, X } from 'lucide-react'

const EVENT_TYPES = [
  { id: 'all',        label: 'All'        },
  { id: 'tournament', label: 'Tournaments' },
  { id: 'open_play',  label: 'Open Play'  },
  { id: 'clinic',     label: 'Clinics'    },
]

const SPORT_OPTIONS = [{ id: 'multi', label: 'Multi-Sport', emoji: '🎯' }, ...SPORTS]

function HostModal({ onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', sport: 'badminton', event_type: 'tournament',
    venue: '', city: '', region: '', date_start: '', date_end: '', max_slots: 32, fee: 0,
  })

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('events').insert([{ ...form, host_id: user.id }])
    if (!error) { onSuccess(); onClose() }
    else alert('Error creating event: ' + error.message)
    setLoading(false)
  }

  const inputClass = "w-full rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none transition-all"
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: '#0f0f1a' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic uppercase text-white">Host an Event</h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className={inputClass} style={inputStyle}
            placeholder="Event Title *" value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} required />
          <textarea className={inputClass + ' resize-none'} style={inputStyle}
            placeholder="Description (optional)" rows={2} value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass + ' appearance-none'} style={inputStyle}
              value={form.sport} onChange={e => setForm({...form, sport: e.target.value})}>
              {SPORT_OPTIONS.map(s => <option key={s.id} value={s.id} className="bg-ink-900">{s.emoji} {s.label}</option>)}
            </select>
            <select className={inputClass + ' appearance-none'} style={inputStyle}
              value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})}>
              <option value="tournament" className="bg-ink-900">Tournament</option>
              <option value="open_play"  className="bg-ink-900">Open Play</option>
              <option value="clinic"     className="bg-ink-900">Clinic</option>
            </select>
          </div>
          <input className={inputClass} style={inputStyle}
            placeholder="Venue name *" value={form.venue}
            onChange={e => setForm({...form, venue: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} style={inputStyle}
              placeholder="Region" value={form.region}
              onChange={e => setForm({...form, region: e.target.value})} />
            <input className={inputClass} style={inputStyle}
              placeholder="City *" value={form.city}
              onChange={e => setForm({...form, city: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Start Date/Time</label>
              <input type="datetime-local" className={inputClass} style={inputStyle}
                value={form.date_start} onChange={e => setForm({...form, date_start: e.target.value})} required />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>End Date/Time</label>
              <input type="datetime-local" className={inputClass} style={inputStyle}
                value={form.date_end} onChange={e => setForm({...form, date_end: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Max Slots</label>
              <input type="number" min="2" className={inputClass} style={inputStyle}
                value={form.max_slots} onChange={e => setForm({...form, max_slots: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Entry Fee (₱)</label>
              <input type="number" min="0" className={inputClass} style={inputStyle}
                value={form.fee} onChange={e => setForm({...form, fee: parseFloat(e.target.value)})} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full font-black py-4 rounded-2xl text-lg italic uppercase tracking-tight disabled:opacity-50"
            style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.25)' }}>
            {loading ? 'Publishing...' : 'Publish Event'}
          </button>
        </form>
      </div>
    </div>
  )
}

function EventCard({ event, registrations, onRegister }) {
  const sport    = [...SPORTS, { id: 'multi', emoji: '🎯', label: 'Multi-Sport' }].find(s => s.id === event.sport)
  const slotsUsed = registrations?.filter(r => r.event_id === event.id && r.status === 'confirmed').length || 0
  const slotsLeft = event.max_slots - slotsUsed
  const isFull   = slotsLeft <= 0
  const isReg    = registrations?.some(r => r.event_id === event.id)
  const dateStr  = event.date_start
    ? new Date(event.date_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const typeBar  = event.event_type === 'tournament' ? '#FF4D00' : event.event_type === 'open_play' ? '#c8ff00' : '#60A5FA'
  const typeBadge = {
    tournament: { color: '#FF4D00', bg: 'rgba(255,77,0,0.12)', border: 'rgba(255,77,0,0.25)' },
    open_play:  { color: '#c8ff00', bg: 'rgba(200,255,0,0.10)', border: 'rgba(200,255,0,0.2)' },
    clinic:     { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.2)' },
  }[event.event_type] || {}

  return (
    <div className="rounded-[2rem] border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="h-2 w-full" style={{ background: typeBar }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{sport?.emoji}</span>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border"
              style={{ color: typeBadge.color, background: typeBadge.bg, borderColor: typeBadge.border }}>
              {event.event_type.replace('_', ' ')}
            </span>
          </div>
          {event.fee > 0 && (
            <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.55)' }}>₱{event.fee.toLocaleString()}</span>
          )}
        </div>

        <h3 className="font-black text-base text-white mb-3 leading-tight">{event.title}</h3>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Calendar size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            {dateStr}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <MapPin size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            {event.venue}{event.city ? ` · ${event.city}` : ''}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <Users size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            <span style={{ color: isFull ? '#ff4d4d' : slotsLeft <= 5 ? '#facc15' : 'rgba(255,255,255,0.6)' }}>
              {isFull ? 'FULL' : `${slotsLeft} slots left`}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {event.max_slots}</span>
          </div>
        </div>

        {event.description && (
          <p className="text-xs mb-4 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {event.description}
          </p>
        )}

        <button onClick={() => onRegister(event)} disabled={isFull || isReg}
          className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
          style={isReg
            ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
            : isFull
            ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed' }
            : { background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }
          }>
          {isReg ? '✓ Registered' : isFull ? 'Full' : 'Register Now'}
        </button>
      </div>
    </div>
  )
}

export default function EventsPage() {
  const { user }                          = useAuth()
  const [events, setEvents]               = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [typeFilter, setTypeFilter]       = useState('all')
  const [sportFilter, setSportFilter]     = useState('all')
  const [showHostModal, setShowHostModal] = useState(false)

  async function fetchData() {
    setLoading(true)
    const [{ data: evts }, { data: regs }] = await Promise.all([
      supabase.from('events').select('*').eq('is_published', true)
        .gte('date_start', new Date().toISOString()).order('date_start', { ascending: true }),
      user
        ? supabase.from('event_registrations').select('*').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])
    setEvents(evts || [])
    setRegistrations(regs || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [user])

  async function handleRegister(event) {
    if (!user) return
    const isReg = registrations.some(r => r.event_id === event.id)
    if (isReg) await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('user_id', user.id)
    else await supabase.from('event_registrations').insert([{ event_id: event.id, user_id: user.id }])
    fetchData()
  }

  const filtered = events.filter(e => {
    if (typeFilter  !== 'all' && e.event_type !== typeFilter)  return false
    if (sportFilter !== 'all' && e.sport      !== sportFilter) return false
    return true
  })

  const now = new Date()
  const upcoming = filtered.filter(e => (new Date(e.date_start) - now) <= 7 * 24 * 60 * 60 * 1000)
  const later    = filtered.filter(e => (new Date(e.date_start) - now) >  7 * 24 * 60 * 60 * 1000)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Events</h1>
          <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }}>
            Tournaments & Open Play
          </p>
        </div>
        <button onClick={() => setShowHostModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest"
          style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }}>
          <Plus size={14} /> Host
        </button>
      </div>

      {/* Event type filter */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
        {EVENT_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeFilter(t.id)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
            style={typeFilter === t.id
              ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 12px rgba(200,255,0,0.25)' }
              : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {[{ id: 'all', label: 'All Sports', emoji: '🌐' }, ...SPORT_OPTIONS].map(s => (
          <button key={s.id} onClick={() => setSportFilter(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 shrink-0 transition-all"
            style={sportFilter === s.id
              ? { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }
            }>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin" size={28} style={{ color: '#c8ff00' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">📅</p>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>No events found</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Be the first to host one!</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {upcoming.length > 0 && (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-2"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Clock size={10} /> This Week
              </p>
              {upcoming.map(e => (
                <EventCard key={e.id} event={e} registrations={registrations} onRegister={handleRegister} />
              ))}
            </>
          )}
          {later.length > 0 && (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-2 mt-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Calendar size={10} /> Coming Up
              </p>
              {later.map(e => (
                <EventCard key={e.id} event={e} registrations={registrations} onRegister={handleRegister} />
              ))}
            </>
          )}
        </div>
      )}

      {showHostModal && <HostModal user={user} onClose={() => setShowHostModal(false)} onSuccess={fetchData} />}
    </div>
  )
}
