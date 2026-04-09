import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Share2, Loader2, Check, Search, X } from 'lucide-react'

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false) // guard against double submit

  const [formData, setFormData] = useState({
    sport: 'badminton',
    court_name: '',
    result: 'win',
    score: '',
    intensity: 'Med',
    mood: '🔥'
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [taggedUser, setTaggedUser] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2 && !taggedUser) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  async function handleSearch(query) {
    setIsSearching(true)
    const { data } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5)
    setSearchResults(data || [])
    setIsSearching(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Hard guard: prevent any double submission
    if (loading || submitted || !user) return
    if (!formData.court_name.trim()) return

    setLoading(true)
    setSubmitted(true)

    try {
      // Step 1: Insert into games table (single source of truth for stats)
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert([{
          user_id: user.id,
          sport: formData.sport,
          court_name: formData.court_name,
          result: formData.result,
          score: formData.score || null,
          intensity: formData.intensity,
          mood: formData.mood,
          opponent_name: taggedUser ? taggedUser.username : (searchQuery || null),
          tagged_opponent_id: taggedUser ? taggedUser.id : null,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single()

      if (gameError) throw gameError

      // Step 2: Insert into posts table (for feed display only)
      // Link post to game via game_id to prevent duplicates
      const opponentDisplay = taggedUser
        ? `@${taggedUser.username}`
        : (searchQuery || 'Open Play')

      const resultEmoji = formData.result === 'win' ? '🏆' : formData.result === 'loss' ? '❌' : '🤝'
      const scoreText = formData.score ? ` (${formData.score})` : ''

      const { error: postError } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          game_id: gameData.id, // links post to game, unique constraint prevents dupe
          content: `${resultEmoji} Just logged a ${formData.sport} match at ${formData.court_name}. Result: ${formData.result.toUpperCase()}${scoreText}. Vs: ${opponentDisplay}`,
          location_name: formData.court_name,
          sport: formData.sport,
          inserted_at: new Date().toISOString()
        }])

      // Post failure is non-fatal (stats still recorded in games table)
      if (postError) {
        console.warn('Feed post failed (non-fatal):', postError.message)
      }

      navigate('/profile')
    } catch (err) {
      console.error('Error saving match:', err)
      alert('Error saving match: ' + err.message)
      // Reset submitted guard so user can try again after a real error
      setSubmitted(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold italic uppercase tracking-tighter text-white">
          Record Match
        </h1>
        <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1">
          Sync your performance to the network
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sport Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['badminton', 'pickleball', 'tennis', 'tabletennis', 'golf'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFormData({ ...formData, sport: s })}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 transition-all duration-200 ${
                formData.sport === s
                  ? 'bg-accent text-ink-900 border-accent glow-accent scale-105'
                  : 'bg-white/5 border-white/10 text-ink-500 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Main Details Card */}
        <div className="glass p-6 rounded-[2.5rem] border border-white/10 space-y-4 bg-gradient-to-br from-white/5 to-transparent">

          {/* Location */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <MapPin size={18} className="text-ink-600" />
            <input
              className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Where did you play?"
              value={formData.court_name}
              onChange={e => setFormData({ ...formData, court_name: e.target.value })}
              required
            />
          </div>

          {/* Opponent Tagging */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
              <Users size={18} className={taggedUser ? 'text-accent' : 'text-ink-600'} />
              <input
                className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
                placeholder="Tag Opponent (Username)"
                value={taggedUser ? `@${taggedUser.username}` : searchQuery}
                onChange={e => {
                  setTaggedUser(null)
                  setSearchQuery(e.target.value)
                }}
              />
              {isSearching && <Loader2 size={14} className="animate-spin text-ink-600" />}
              {taggedUser && (
                <button
                  type="button"
                  onClick={() => { setTaggedUser(null); setSearchQuery('') }}
                  className="text-spark p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && !taggedUser && (
              <div className="absolute z-50 w-full mt-2 bg-ink-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setTaggedUser(u); setSearchResults([]) }}
                    className="w-full text-left px-4 py-3 text-sm text-ink-100 hover:bg-accent hover:text-ink-900 transition-colors flex items-center justify-between border-b border-white/5 last:border-none"
                  >
                    <span>@{u.username}</span>
                    <Check size={14} className="opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5 focus-within:border-accent/50 transition-colors">
            <Search size={18} className="text-ink-600" />
            <input
              className="bg-transparent border-none w-full py-4 text-sm text-white focus:ring-0 placeholder:text-ink-700"
              placeholder="Final Score (e.g. 21-15, 21-18)"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: e.target.value })}
            />
          </div>
        </div>

        {/* Result Selector */}
        <div className="grid grid-cols-2 gap-4">
          {['win', 'loss'].map(res => (
            <button
              key={res}
              type="button"
              onClick={() => setFormData({ ...formData, result: res })}
              className={`py-5 rounded-[2rem] font-display font-bold uppercase italic border-2 transition-all duration-300 tracking-tighter text-lg ${
                formData.result === res
                  ? res === 'win'
                    ? 'border-accent text-accent bg-accent/5 glow-accent'
                    : 'border-spark text-spark bg-spark/5 shadow-[0_0_20px_rgba(255,50,50,0.1)]'
                  : 'border-white/5 text-ink-800 opacity-50 hover:opacity-100'
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || submitted}
          className="w-full bg-accent text-ink-900 font-display font-black py-6 rounded-[2.5rem] glow-accent uppercase italic tracking-tighter text-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-50 disabled:grayscale mt-4"
        >
          {loading
            ? <Loader2 className="animate-spin" />
            : <><Share2 size={24} /> Sync Game</>
          }
        </button>
      </form>
    </div>
  )
}
