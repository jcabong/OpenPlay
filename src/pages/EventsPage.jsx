import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, SPORTS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Calendar, MapPin, Users, Clock, Plus, Loader2, X, Navigation, Timer, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'

// ── Google Maps ───────────────────────────────────────────────────────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

function useGoogleMaps() {
  const [ready, setReady] = useState(!!window.google?.maps?.places)
  useEffect(() => {
    if (window.google?.maps?.places) { setReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id    = 'gmap-script'
      script.src   = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const poll = setInterval(() => {
      if (window.google?.maps?.places) { setReady(true); clearInterval(poll) }
    }, 100)
    return () => clearInterval(poll)
  }, [])
  return ready
}

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

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

function buildISO(year, month, day, hour, minute, ampm) {
  let h = parseInt(hour)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  const pad = n => String(n).padStart(2, '0')
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(minute)}:00+08:00`
}

// ── Venue Search (Google Places — identical to LogGamePage) ──────────────────
function VenueSearch({ venue, city, onVenueChange, onCityChange }) {
  const [query, setQuery]             = useState(venue || '')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching]     = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [focused, setFocused]         = useState(false)
  const debounceRef                   = useRef(null)
  const sessionTokenRef               = useRef(null)
  const mapsReady                     = useGoogleMaps()

  useEffect(() => {
    if (mapsReady) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [mapsReady])

  async function searchPlaces(q) {
    if (q.length < 2 || !mapsReady) { setSuggestions([]); return }
    setSearching(true)
    try {
      const result = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['ph'],
      })
      setSuggestions((result.suggestions || []).map(s => {
        const p = s.placePrediction
        return {
          placeId:   p.placeId,
          name:      p.mainText?.text || p.text?.text || '',
          secondary: p.secondaryText?.text || '',
        }
      }))
    } catch(e) {
      console.error('Places error', e)
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    onVenueChange(val)
    onCityChange('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 300)
  }

  async function pickSuggestion(s) {
    setQuery(s.name)
    onVenueChange(s.name)
    setSuggestions([])
    try {
      const place = new window.google.maps.places.Place({ id: s.placeId, requestedLanguage: 'en' })
      await place.fetchFields({ fields: ['addressComponents'] })
      const comps    = place.addressComponents || []
      const cityComp = comps.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3') || c.types.includes('sublocality_level_1'))
      onCityChange(cityComp?.longText || cityComp?.long_name || '')
    } catch {
      const parts = s.secondary.split(',').map(p => p.trim()).filter(Boolean)
      onCityChange(parts[0] || '')
    }
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }

  function clearLocation() {
    setQuery(''); onVenueChange(''); onCityChange(''); setSuggestions([])
  }

  async function detectGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_KEY}`)
          const data = await res.json()
          const result     = data.results?.[0]
          if (!result) { alert('Could not get location'); setGpsLoading(false); return }
          const components = result.address_components
          const premise    = components.find(c => c.types.includes('premise') || c.types.includes('establishment'))
          const cityComp   = components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_3'))
          const name       = premise?.long_name || result.formatted_address.split(',')[0].trim()
          const cityVal    = cityComp?.long_name || ''
          setQuery(name)
          onVenueChange(name)
          onCityChange(cityVal)
        } catch {
          alert('Could not get location')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { setGpsLoading(false); alert('Location access denied') }
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5">
        <MapPin size={15} style={{ color: '#c8ff00', opacity: 0.8 }} className="shrink-0" />
        <input
          className="flex-1 py-3.5 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          style={{ color: '#ffffff', caretColor: '#c8ff00' }}
          placeholder="Search court or venue…"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoComplete="off"
        />
        {searching && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        {query && !searching && (
          <button type="button" onClick={clearLocation} className="shrink-0 text-white/30 hover:text-white/60">
            <X size={14} />
          </button>
        )}
        <button type="button" onClick={detectGPS} disabled={gpsLoading} title="Use my location"
          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: gpsLoading ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}>
          {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        </button>
      </div>

      {focused && suggestions.length > 0 && (
        <div className="mx-3 mb-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#13131f' }}>
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors">
              <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: '#c8ff00', opacity: 0.7 }} />
              <div>
                <p className="text-xs font-bold text-white leading-tight">{s.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.secondary}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {city && (
        <div className="px-4 pb-2 pt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
            style={{ background: 'rgba(200,255,0,0.1)', color: '#c8ff00' }}>
            📍 {city}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Date Time Picker ─────────────────────────────────────────────────────────
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
    onChange({ year: y, month: mo, day: d, hour: h, minute: mi, ampm: ap, iso: buildISO(y, mo, d, h, mi, ap) })
  }

  const sel = "rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none flex-1"
  const ss  = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
      <div className="flex gap-2 mb-2">
        <select className={sel} style={ss} value={month} onChange={e => { const v=+e.target.value; setMonth(v); emit(year,v,day,hour,minute,ampm) }}>
          {MONTHS.map((m,i) => <option key={i} value={i} className="bg-ink-900">{m}</option>)}
        </select>
        <select className={sel} style={ss} value={day} onChange={e => { const v=+e.target.value; setDay(v); emit(year,month,v,hour,minute,ampm) }}>
          {days.map(d => <option key={d} value={d} className="bg-ink-900">{d}</option>)}
        </select>
        <select className={sel} style={ss} value={year} onChange={e => { const v=+e.target.value; setYear(v); emit(v,month,day,hour,minute,ampm) }}>
          {years.map(y => <option key={y} value={y} className="bg-ink-900">{y}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <select className={sel} style={ss} value={hour} onChange={e => { setHour(e.target.value); emit(year,month,day,e.target.value,minute,ampm) }}>
          {HOURS.map(h => <option key={h} value={h} className="bg-ink-900">{h}</option>)}
        </select>
        <select className={sel} style={ss} value={minute} onChange={e => { setMinute(e.target.value); emit(year,month,day,hour,e.target.value,ampm) }}>
          {MINUTES.map(m => <option key={m} value={m} className="bg-ink-900">{m}</option>)}
        </select>
        <select className={sel} style={{ ...ss, fontWeight: 'bold' }} value={ampm} onChange={e => { setAmpm(e.target.value); emit(year,month,day,hour,minute,e.target.value) }}>
          <option value="AM" className="bg-ink-900">AM</option>
          <option value="PM" className="bg-ink-900">PM</option>
        </select>
      </div>
    </div>
  )
}

// ── Countdown ────────────────────────────────────────────────────────────────
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
      <Timer size={10} /> {time}
    </div>
  )
}

// ── Host Modal ───────────────────────────────────────────────────────────────
const EVENT_TYPE_OPTIONS = [
  { id: 'tournament', label: 'Tournament', emoji: '🏆', desc: 'Competitive bracket play' },
  { id: 'open_play',  label: 'Open Play',  emoji: '🏸', desc: 'Casual drop-in session'  },
  { id: 'clinic',     label: 'Clinic',     emoji: '📚', desc: 'Coaching & skills clinic' },
]

function HostModal({ onClose, onSuccess, user, editEvent }) {
  const isEdit = !!editEvent
  const [loading,   setLoading]   = useState(false)
  const [eventType, setEventType] = useState(editEvent?.event_type || null)
  const [form, setForm] = useState({
    title:       editEvent?.title       || '',
    description: editEvent?.description || '',
    sport:       editEvent?.sport       || 'badminton',
    venue:       editEvent?.venue       || '',
    city:        editEvent?.city        || '',
    max_slots:   editEvent?.max_slots   || 32,
    fee:         editEvent?.fee         || 0,
  })
  const [dateStart, setDateStart] = useState(null)
  const [dateEnd,   setDateEnd]   = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!dateStart?.iso && !isEdit) return alert('Please set a start date and time')
    setLoading(true)
    const payload = {
      ...form,
      event_type:   eventType,
      ...(dateStart?.iso ? { date_start: dateStart.iso } : {}),
      ...(dateEnd?.iso   ? { date_end:   dateEnd.iso   } : {}),
    }
    let error
    if (isEdit) {
      ({ error } = await supabase.from('events').update(payload).eq('id', editEvent.id).eq('host_id', user.id))
    } else {
      payload.host_id      = user.id
      payload.is_published = true
      ;({ error } = await supabase.from('events').insert([payload]))
    }
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
              {isEdit ? 'Edit Event' : eventType ? `Host ${EVENT_TYPE_OPTIONS.find(t => t.id === eventType)?.label}` : 'Host an Event'}
            </h2>
            {!isEdit && eventType && (
              <button type="button" onClick={() => setEventType(null)}
                className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                ← Change type
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Step 1: Pick type (only for new events) */}
        {!eventType && !isEdit ? (
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
          <form onSubmit={submit} className="space-y-4">
            <input className={inputClass} style={inputStyle} placeholder="Event Title *"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <textarea className={inputClass + ' resize-none'} style={inputStyle} placeholder="Description (optional)" rows={2}
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Sport</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {SPORTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setForm({ ...form, sport: s.id })}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all"
                    style={form.sport === s.id
                      ? { background: '#c8ff00', borderColor: '#c8ff00', color: '#0a0a0f' }
                      : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.45)' }}>Venue / Court</label>
              <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <VenueSearch venue={form.venue} city={form.city}
                  onVenueChange={v => setForm(f => ({ ...f, venue: v }))}
                  onCityChange={v  => setForm(f => ({ ...f, city: v  }))} />
              </div>
            </div>
            <DateTimePicker label="Start Date & Time *" value={dateStart} onChange={setDateStart} />
            <DateTimePicker label="End Date & Time (optional)" value={dateEnd} onChange={setDateEnd} />
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
              {loading ? (isEdit ? 'Saving...' : 'Publishing...') : (isEdit ? 'Save Changes' : 'Publish Event')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, allRegistrations, userRegistrations, user, onRegister, onDelete, onEdit }) {
  const sport      = SPORTS.find(s => s.id === event.sport)
  const slotsUsed  = allRegistrations.filter(r => r.event_id === event.id).length
  const slotsLeft  = event.max_slots - slotsUsed
  const isFull     = slotsLeft <= 0
  const isReg      = userRegistrations.some(r => r.event_id === event.id)
  const isHost     = user?.id === event.host_id
  const [showMenu, setShowMenu]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const menuRef                       = useRef(null)

  useEffect(() => {
    function outside(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const dateStr = event.date_start
    ? new Date(event.date_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const timeStr = event.date_start
    ? new Date(event.date_start).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''

  const typeBar   = { tournament: '#FF4D00', open_play: '#c8ff00', clinic: '#60A5FA' }[event.event_type] || '#fff'
  const typeBadge = {
    tournament: { color: '#FF4D00', bg: 'rgba(255,77,0,0.12)',   border: 'rgba(255,77,0,0.25)'   },
    open_play:  { color: '#c8ff00', bg: 'rgba(200,255,0,0.10)',  border: 'rgba(200,255,0,0.2)'   },
    clinic:     { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.2)'  },
  }[event.event_type] || {}

  return (
    <div className="rounded-[2rem] border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="h-2 w-full" style={{ background: typeBar }} />
      <div className="p-5">

        {/* Top row: badge + fee + host menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{sport?.emoji || '🎯'}</span>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border"
              style={{ color: typeBadge.color, background: typeBadge.bg, borderColor: typeBadge.border }}>
              {event.event_type?.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {event.fee > 0 && (
              <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.55)' }}>₱{event.fee.toLocaleString()}</span>
            )}
            {/* Host-only 3-dot menu */}
            {isHost && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(v => !v)}
                  className="p-1.5 rounded-xl hover:bg-white/10 transition-all"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <MoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden min-w-[150px]"
                    style={{ background: '#1a1a2e' }}>
                    <button onClick={() => { setShowMenu(false); onEdit(event) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-white text-xs font-black uppercase tracking-widest hover:bg-white/5 border-b border-white/5">
                      <Pencil size={13} /> Edit Event
                    </button>
                    <button onClick={() => { setShowMenu(false); setConfirmDel(true) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-red-500/10"
                      style={{ color: '#ff4d4d' }}>
                      <Trash2 size={13} /> Delete Event
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDel && (
          <div className="mb-4 p-4 rounded-2xl border" style={{ background: 'rgba(255,77,77,0.08)', borderColor: 'rgba(255,77,77,0.2)' }}>
            <p className="text-sm text-white font-bold mb-1">Delete this event?</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>All registrations will also be removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase border"
                style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmDel(false); onDelete(event.id) }}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase text-white"
                style={{ background: '#ff4d4d' }}>
                Delete
              </button>
            </div>
          </div>
        )}

        <h3 className="font-black text-base text-white mb-1 leading-tight">{event.title}</h3>

        {/* Host username */}
        {event.host?.username && (
          <p className="text-[10px] font-black mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Hosted by <span style={{ color: '#c8ff00' }}>@{event.host.username}</span>
          </p>
        )}

        {/* Meta */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Calendar size={11} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
            {dateStr}{timeStr && ` · ${timeStr}`}
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

        {/* Register / Cancel / Full button */}
        {!isHost && (
          <button onClick={() => onRegister(event)} disabled={isFull && !isReg}
            className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
            style={isReg
              ? { background: 'rgba(255,77,77,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,77,77,0.3)' }
              : isFull
              ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed' }
              : { background: '#c8ff00', color: '#0a0a0f', boxShadow: '0 0 14px rgba(200,255,0,0.25)' }
            }>
            {isReg ? '✕ Cancel Registration' : isFull ? 'Full' : 'Register Now'}
          </button>
        )}

        {isHost && (
          <div className="py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10"
            style={{ color: '#c8ff00' }}>
            👑 You're hosting this
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user }                          = useAuth()
  const [events, setEvents]               = useState([])
  const [allRegs, setAllRegs]             = useState([])
  const [userRegs, setUserRegs]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [typeFilter, setTypeFilter]       = useState('all')
  const [showHostModal, setShowHostModal] = useState(false)
  const [editEvent, setEditEvent]         = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: evts }, { data: aRegs }, { data: uRegs }] = await Promise.all([
      // Join host user info for username display
      supabase.from('events').select('*, host:users!events_host_id_fkey(id, username)')
        .eq('is_published', true)
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true }),
      supabase.from('event_registrations').select('event_id, user_id'),
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

  useEffect(() => {
    const channel = supabase.channel('events-realtime-v2')
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

  async function handleDelete(eventId) {
    await supabase.from('event_registrations').delete().eq('event_id', eventId)
    await supabase.from('events').delete().eq('id', eventId).eq('host_id', user.id)
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
                <EventCard key={e.id} event={e} allRegistrations={allRegs} userRegistrations={userRegs}
                  user={user} onRegister={handleRegister} onDelete={handleDelete} onEdit={ev => setEditEvent(ev)} />
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
                <EventCard key={e.id} event={e} allRegistrations={allRegs} userRegistrations={userRegs}
                  user={user} onRegister={handleRegister} onDelete={handleDelete} onEdit={ev => setEditEvent(ev)} />
              ))}
            </>
          )}
        </div>
      )}

      {showHostModal && (
        <HostModal user={user} onClose={() => setShowHostModal(false)} onSuccess={fetchData} />
      )}
      {editEvent && (
        <HostModal user={user} editEvent={editEvent} onClose={() => setEditEvent(null)} onSuccess={fetchData} />
      )}
    </div>
  )
}
