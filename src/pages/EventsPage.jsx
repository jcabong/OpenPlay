import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Calendar, MapPin, Users, Clock, Plus, Loader2, X, Navigation, Timer } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { id: 'all',        label: 'All'         },
  { id: 'tournament', label: 'Tournaments' },
  { id: 'open_play',  label: 'Open Play'   },
  { id: 'clinic',     label: 'Clinics'     },
]

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function buildISO(year, month, day, hour, minute, ampm) {
  let h = parseInt(hour)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  // Build as Philippine time (UTC+8)
  const pad = n => String(n).padStart(2, '0')
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(minute)}:00+08:00`
}

// ── Venue Location Search ────────────────────────────────────────────────────
function VenueSearch({ venue, city, onVenueChange, onCityChange }) {
  const [query, setQuery]         = useState(venue || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [focused, setFocused]     = useState(false)
  const debounceRef               = useRef(null)
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }

  async function searchPlaces(q) {
    if (q.length < 2) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=ph`)
      const data = await res.json()
      setSuggestions(data.map(r => ({
        display: r.display_name.split(',').slice(0, 2).join(',').trim(),
        name:    r.address?.amenity || r.address?.leisure || r.address?.building || r.name || '',
        city:    r.address?.city || r.address?.town || r.address?.municipality || r.address?.county || '',
      })))
    } catch { setSuggestions([]) }
    finally  { setSearching(false) }
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    onVenueChange(val)
    onCityChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 350)
  }

  function pick(s) {
    const v = s.name || s.display.split(',')[0].trim()
    setQuery(s.display)
    onVenueChange(v)
    onCityChange(s.city)
    setSuggestions([])
  }

  function clear() { setQuery(''); onVenueChange(''); onCityChange(''); setSuggestions([]) }

  async function gps() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
        const data = await res.json()
        const name = data.address?.amenity || data.address?.leisure || data.address?.building || ''
        const c    = data.address?.city || data.address?.town || data.address?.municipality || ''
        const disp = name ? `${name}, ${c}` : c
        setQuery(disp)
        onVenueChange(name || disp)
        onCityChange(c)
      } catch { alert('Could not get location') }
      finally  { setGpsLoading(false) }
    }, () => { setGpsLoading(false); alert('Location access denied') })
  }

  return (
    <div>
      <div className="flex items-center gap-2 w-full rounded-2xl px-4" style={inputStyle}>
        <MapPin size={14} style={{ color: '#c8ff00' }} className="shrink-0" />
        <input
          className="flex-1 py-3.5 text-sm text-white bg-transparent focus:outline-none"
          placeholder="Search venue or court…"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoComplete="off"
        />
        {searching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {query && !searching && <button type="button" onClick={clear} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={13} /></button>}
        <button type="button" onClick={gps} disabled={gpsLoading} style={{ color: gpsLoading ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}>
          {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
        </button>
      </div>

      {focused && suggestions.length > 0 && (
        <div className="mt-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#13131f' }}>
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => pick(s)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors">
              <MapPin size={12} style={{ color: '#c8ff00' }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">{s.display.split(',')[0].trim()}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.display.split(',').slice(1).join(',').trim()}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {city && (
        <p className="text-[10px] font-black mt-1.5 ml-1" style={{ color: '#c8ff00' }}>📍 {city}</p>
      )}
    </div>
  )
}

// ── Date + Time Picker ───────────────────────────────────────────────────────
function DateTimePicker({ label, value, onChange }) {
  const now   = new Date()
  const years = [now.getFullYear(), now.getFullYear() + 1]

  const [year,   setYear]   = useState(value?.year   || now.getFullYear())
  const [month,  setMonth]  = useState(value?.month  ?? now.getMonth())
  const [day,    setDay]    = useState(value?.day     || now.getDate())
  const [hour,   setHour]   = useState(value?.hour   || '08')
  const [minute, setMinute] = useState(value?.minute || '00')
  const [ampm,   setAmpm]   = useState(value?.ampm   || 'AM')

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  function emit(y, mo, d, h, mi, ap) {
    onChange({ year: y, month: mo, day: d, hour: h, minute: mi, ampm: ap,
      iso: buildISO(y, mo, d, h, mi, ap) })
  }

  const sel = "rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none flex-1"
  const selStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
      {/* Date row */}
      <div className="flex gap-2 mb-2">
        <select className={sel} style={selStyle} value={month} onChange={e => { const v = +e.target.value; setMonth(v); emit(year, v, day, hour, minute, ampm) }}>
          {MONTHS.map((m, i) => <option key={i} value={i} className="bg-ink-900">{m}</option>)}
        </select>
        <select className={sel} style={selStyle} value={day} onChange={e => { const v = +e.target.value; setDay(v); emit(year, month, v, hour, minute, ampm) }}>
          {days.map(d => <option key={d} value={d} className="bg-ink-900">{d}</option>)}
        </select>
        <select className={sel} style={selStyle} value={year} onChange={e => { const v = +e.target.value; setYear(v); emit(v, month, day, hour, minute, ampm) }}>
          {years.map(y => <option key={y} value={y} className="bg-ink-900">{y}</option>)}
        </select>
      </div>
      {/* Time row */}
      <div className="flex gap-2">
        <select className={sel} style={selStyle} value={hour} onChange={e => { setHour(e.target.value); emit(year, month, day, e.target.value, minute, ampm) }}>
          {HOURS.map(h => <option key={h} value={h} className="bg-ink-900">{h}</option>)}
        </select>
        <select className={sel} style={selStyle} value={minute} onChange={e => { setMinute(e.target.value); emit(year, month, day, hour, e.target.value, ampm) }}>
          {MINUTES.map(m => <option key={m} value={m} className="bg-ink-900">{m}</option>)}
        </select>
        <select className={sel} style={{ ...selStyle, fontWeight: 'bold' }} value={ampm} onChange={e => { setAmpm(e.target.value); emit(year, month, day, hour, minute, e.target.value) }}>
          <option value="AM" className="bg-ink-900">AM</option>
          <option value="PM" className="bg-ink-900">PM</option>
        </select>
      </div>
    </div>
  )
}

// ── Countdown Timer ──────────────────────────────────────────────────────────
function Countdown({ dateStart }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      const diff = new Date(dateStart) - new Date()
      if (diff <= 0) { setTime('Started!'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTime(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [dateStart])

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-black" style={{ color: '#c8ff00' }}>
      <Timer size={10} />
      {time}
    </div>
  )
}

// ── Host Modal ───────────────────────────────────────────────────────────────
const EVENT_TYPE_OPTIONS = [
  { id: 'tournament', label: 'Tournament', emoji: '🏆', desc: 'Competitive bracket play' },
  { id: 'open_play',  label: 'Open Play',  emoji: '🏸', desc: 'Casual drop-in session'  },
  { id: 'clinic',     label: 'Clinic',     emoji: '📚', desc: 'Coaching & skills clinic' },
]

function HostModal({ onClose, onSuccess, user }) {
  const [loading,    setLoading]    = useState(false)
  const [eventType,  setEventType]  = useState(null) // step 1: pick type
  const [form, setForm] = useState({
    title: '', description: '', sport: 'badminton',
    venue: '', city: '',
    max_slots: 32, fee: 0,
  })
  const [dateStart, setDateStart] = useState(null)
  const [dateEnd,   setDateEnd]   = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!dateStart?.iso) return alert('Please set a start date and time')
    setLoading(true)
    const payload = {
      ...form,
      event_type:   eventType,
      host_id:      user.id,
      date_start:   dateStart.iso,
      date_end:     dateEnd?.iso || null,
      is_published: true,
    }
    const { error } = await supabase.from('events').insert([payload])
    if (!error) { onSuccess(); onClose() }
    else alert('Error: ' + error.message)
    setLoading(false)
  }

  const inputClass = "w-full rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none"
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full rounded-t-[2.5rem] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto" style={{ background: '#0f0f1a' }}>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black italic uppercase text-white">
              {eventType ? `Host ${EVENT_TYPE_OPTIONS.find(t => t.id === eventType)?.label}` : 'Host an Event'}
            </h2>
            {eventType && (
              <button type="button" onClick={() => setEventType(null)}
                className="text-[10px] font-black uppercase tracking-widest mt-0.5"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                ← Change type
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Step 1: Pick event type */}
        {!eventType ? (
          <div className="space-y-3">
            <p className="text-xs font-bold mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>What kind of event are you hosting?</p>
            {EVENT_TYPE_OPTIONS.map(t => (
              <button key={t.id} type="button" onClick={() => setEventType(t.id)}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="text-3xl">{t.emoji}</span>
                <div>
                  <p className="font-black text-white text-base">{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Step 2: Fill details */
          <form onSubmit={submit} className="space-y-4">

            {/* Title */}
            <input className={inputClass} style={inputStyle}
              placeholder="Event Title *" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required />

            {/* Description */}
            <textarea className={inputClass + ' resize-none'} style={inputStyle}
              placeholder="Description (optional)" rows={2}
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            {/* Sport */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Sport</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {SPORTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setForm({ ...form, sport: s.id })}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all"
                    style={form.sport === s.id
                      ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f' }
                      : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }
                    }>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Venue with location search */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Venue / Court</label>
              <VenueSearch
                venue={form.venue} city={form.city}
                onVenueChange={v => setForm(f => ({ ...f, venue: v }))}
                onCityChange={v  => setForm(f => ({ ...f, city: v  }))}
              />
            </div>

            {/* Start Date/Time */}
            <DateTimePicker label="Start Date & Time *" value={dateStart} onChange={setDateStart} />

            {/* End Date/Time */}
            <DateTimePicker label="End Date & Time (optional)" value={dateEnd} onChange={setDateEnd} />

            {/* Slots & Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Max Players</label>
                <input type="number" min="2" className={inputClass} style={inputStyle}
                  value={form.max_slots} onChange={e => setForm({ ...form, max_slots: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Entry Fee (₱)</label>
                <input type="number" min="0" className={inputClass} style={inputStyle}
                  value={form.fee} onChange={e => setForm({ ...form, fee: parseFloat(e.target.value) })} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full font-black py-4 rounded-2xl text-lg italic uppercase tracking-tight disabled:opacity-50"
              style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 20px rgba(200,255,0,0.25)' }}>
              {loading ? 'Publishing...' : 'Publish Event'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, allRegistrations, userRegistrations, onRegister }) {
  const sport     = SPORTS.find(s => s.id === event.sport)
  // ✅ Fixed: count ALL registrations for this event (not just user's, not filtered by status)
  const slotsUsed = allRegistrations.filter(r => r.event_id === event.id).length
  const slotsLeft = event.max_slots - slotsUsed
  const isFull    = slotsLeft <= 0
  const isReg     = userRegistrations.some(r => r.event_id === event.id)

  const dateStr = event.date_start
    ? new Date(event.date_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const timeStr = event.date_start
    ? new Date(event.date_start).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  const typeBar = { tournament: '#FF4D00', open_play: '#c8ff00', clinic: '#60A5FA' }[event.event_type] || '#fff'
  const typeBadge = {
    tournament: { color: '#FF4D00', bg: 'rgba(255,77,0,0.12)',    border: 'rgba(255,77,0,0.25)'    },
    open_play:  { color: '#c8ff00', bg: 'rgba(200,255,0,0.10)',   border: 'rgba(200,255,0,0.2)'    },
    clinic:     { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.2)'   },
  }[event.event_type] || {}

  return (
    <div className="rounded-[2rem] border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="h-2 w-full" style={{ background: typeBar }} />
      <div className="p-5">

        {/* Type badge + fee */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{sport?.emoji || '🎯'}</span>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border"
              style={{ color: typeBadge.color, background: typeBadge.bg, borderColor: typeBadge.border }}>
              {event.event_type?.replace('_', ' ')}
            </span>
          </div>
          {event.fee > 0 && (
            <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.55)' }}>₱{event.fee.toLocaleString()}</span>
          )}
        </div>

        <h3 className="font-black text-base text-white mb-3 leading-tight">{event.title}</h3>

        {/* Meta */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Calendar size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            {dateStr} {timeStr && `· ${timeStr}`}
          </div>
          {(event.venue || event.city) && (
            <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
              {event.venue}{event.city ? ` · ${event.city}` : ''}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <Users size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            <span style={{ color: isFull ? '#ff4d4d' : slotsLeft <= 5 ? '#facc15' : 'rgba(255,255,255,0.6)' }}>
              {isFull ? 'FULL' : `${slotsLeft} slots left`}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {event.max_slots}</span>
          </div>
        </div>

        {/* Countdown */}
        {event.date_start && new Date(event.date_start) > new Date() && (
          <div className="mb-3 px-3 py-2 rounded-xl border border-white/5" style={{ background: 'rgba(200,255,0,0.06)' }}>
            <Countdown dateStart={event.date_start} />
          </div>
        )}

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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user }                          = useAuth()
  const [events, setEvents]               = useState([])
  const [allRegs, setAllRegs]             = useState([])   // all registrations for slot count
  const [userRegs, setUserRegs]           = useState([])   // current user's registrations
  const [loading, setLoading]             = useState(true)
  const [typeFilter, setTypeFilter]       = useState('all')
  const [showHostModal, setShowHostModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: evts }, { data: aRegs }, { data: uRegs }] = await Promise.all([
      // ✅ Fetch all future published events
      supabase.from('events').select('*').eq('is_published', true)
        .gte('date_start', new Date().toISOString()).order('date_start', { ascending: true }),
      // ✅ Fetch ALL registrations for all events (for accurate slot count)
      supabase.from('event_registrations').select('event_id, user_id'),
      // ✅ Fetch current user's registrations separately
      user
        ? supabase.from('event_registrations').select('*').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])
    setEvents(evts || [])
    setAllRegs(aRegs || [])
    setUserRegs(uRegs || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // ✅ Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  async function handleRegister(event) {
    if (!user) return
    const isReg = userRegs.some(r => r.event_id === event.id)
    if (isReg) {
      await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('user_id', user.id)
    } else {
      await supabase.from('event_registrations').insert([{ event_id: event.id, user_id: user.id, status: 'confirmed' }])
    }
    fetchData()
  }

  const filtered = events.filter(e => typeFilter === 'all' || e.event_type === typeFilter)
  const now      = new Date()
  const upcoming = filtered.filter(e => (new Date(e.date_start) - now) <= 7 * 24 * 60 * 60 * 1000)
  const later    = filtered.filter(e => (new Date(e.date_start) - now) >  7 * 24 * 60 * 60 * 1000)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Events</h1>
          <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }}>
            Tournaments · Open Play · Clinics
          </p>
        </div>
        <button onClick={() => setShowHostModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest"
          style={{ background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }}>
          <Plus size={14} /> Host
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
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
                <EventCard key={e.id} event={e} allRegistrations={allRegs} userRegistrations={userRegs} onRegister={handleRegister} />
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
                <EventCard key={e.id} event={e} allRegistrations={allRegs} userRegistrations={userRegs} onRegister={handleRegister} />
              ))}
            </>
          )}
        </div>
      )}

      {showHostModal && <HostModal user={user} onClose={() => setShowHostModal(false)} onSuccess={fetchData} />}
    </div>
  )
}
