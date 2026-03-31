import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Plus, X, MapPin, Check } from 'lucide-react'

const SPORTS = [
  { value: 'badminton',  label: 'Badminton',  emoji: '🏸' },
  { value: 'pickleball', label: 'Pickleball', emoji: '🥒' },
]

const RESULTS = [
  { value: 'win',  label: 'Win',  color: 'border-court-500 text-court-400 bg-court-500/10' },
  { value: 'loss', label: 'Loss', color: 'border-spark text-spark bg-spark/10' },
  { value: 'draw', label: 'Draw', color: 'border-white/20 text-ink-300 bg-white/5' },
]

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    sport: 'badminton',
    score: '',
    location: '',
    result: 'win',
  })
  const [opponents, setOpponents] = useState([''])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function addOpponent() {
    if (opponents.length < 4) setOpponents(o => [...o, ''])
  }
  function removeOpponent(i) {
    setOpponents(o => o.filter((_, idx) => idx !== i))
  }
  function updateOpponent(i, val) {
    setOpponents(o => o.map((v, idx) => idx === i ? val : v))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.score.trim()) { setError('Please enter a score.'); return }
    setError('')
    setSaving(true)

    try {
      // Insert game
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ user_id: user.id, ...form })
        .select()
        .single()

      if (gameErr) throw gameErr

      // Insert game_players (opponents)
      const validOpponents = opponents.filter(o => o.trim())
      if (validOpponents.length > 0) {
        await supabase.from('game_players').insert(
          validOpponents.map(name => ({ game_id: game.id, player_name: name.trim() }))
        )
      }

      setSaved(true)
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pb-6">
      {/* Header */}
      <div className="pt-6 pb-5">
        <h1 className="font-display text-2xl font-bold text-ink-50">Log a Game</h1>
        <p className="text-ink-400 text-sm mt-1">Record your latest match</p>
      </div>

      {saved ? (
        <div className="flex flex-col items-center justify-center py-20 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-court-500/20 border border-court-500/40 flex items-center justify-center mb-4">
            <Check size={28} className="text-court-400" />
          </div>
          <p className="font-display text-xl font-bold text-ink-50">Game Logged!</p>
          <p className="text-ink-400 text-sm mt-1">Redirecting to feed…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sport selector */}
          <div>
            <label className="block text-xs font-semibold text-ink-300 uppercase tracking-widest mb-2.5">Sport</label>
            <div className="grid grid-cols-2 gap-2">
              {SPORTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('sport', s.value)}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all ${
                    form.sport === s.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-white/8 glass text-ink-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="font-semibold text-sm">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs font-semibold text-ink-300 uppercase tracking-widest mb-2.5">Result</label>
            <div className="grid grid-cols-3 gap-2">
              {RESULTS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('result', r.value)}
                  className={`py-3 rounded-2xl border font-display font-bold text-sm transition-all ${
                    form.result === r.value ? r.color + ' border-opacity-100' : 'border-white/8 glass text-ink-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="block text-xs font-semibold text-ink-300 uppercase tracking-widest mb-2.5">Score</label>
            <input
              type="text"
              value={form.score}
              onChange={e => set('score', e.target.value)}
              placeholder="e.g. 21-18, 15-12"
              className="w-full glass rounded-2xl px-4 py-3.5 text-ink-50 placeholder-ink-500 border border-white/8 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-ink-300 uppercase tracking-widest mb-2.5">Location</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. SM Bacoor Sports Club"
                className="w-full glass rounded-2xl pl-10 pr-4 py-3.5 text-ink-50 placeholder-ink-500 border border-white/8 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </div>

          {/* Opponents */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-ink-300 uppercase tracking-widest">Opponents</label>
              {opponents.length < 4 && (
                <button type="button" onClick={addOpponent}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
                  <Plus size={13} /> Add
                </button>
              )}
            </div>
            <div className="space-y-2">
              {opponents.map((opp, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opp}
                    onChange={e => updateOpponent(i, e.target.value)}
                    placeholder={`Opponent ${i + 1}`}
                    className="flex-1 glass rounded-2xl px-4 py-3 text-ink-50 placeholder-ink-500 border border-white/8 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                  />
                  {opponents.length > 1 && (
                    <button type="button" onClick={() => removeOpponent(i)}
                      className="p-3 glass rounded-2xl text-ink-500 hover:text-spark transition-colors border border-white/8">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-spark text-sm bg-spark/10 border border-spark/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent text-ink-900 font-display font-bold text-base py-4 rounded-2xl hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-accent mt-2"
          >
            {saving ? 'Saving…' : 'Log Game'}
          </button>
        </form>
      )}
    </div>
  )
}
