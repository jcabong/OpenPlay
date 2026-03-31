import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Trophy, Target, MapPin, Zap, Users, Share2 } from 'lucide-react'

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sport: 'tennis',
    court_name: '',
    result: 'win',
    score: '',
    opponent_name: '',
    intensity: 'Medium',
    mood: '🔥'
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    
    // 1. Log the Game
    const { data: game, error: gameError } = await supabase.from('games').insert([{ 
      user_id: user.id, 
      ...formData,
      created_at: new Date()
    }]).select().single()

    if (gameError) {
      alert(gameError.message)
    } else {
      // 2. Automatically create a "Highlight Post" on the Feed
      const highlightContent = `🎾 Just finished a ${formData.sport} match at ${formData.court_name}! Result: ${formData.result.toUpperCase()} (${formData.score}). Feeling ${formData.mood}!`
      await supabase.from('posts').insert([{
        user_id: user.id,
        content: highlightContent,
        location_name: formData.court_name,
        sport: formData.sport
      }])
      
      navigate('/profile')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <h1 className="text-3xl font-display font-bold italic uppercase mb-2">Log Game Day</h1>
      <p className="text-ink-600 text-[10px] font-black uppercase tracking-widest mb-8">Gamify your progress</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Racket Sport Selector */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {['tennis', 'pickleball', 'golf', 'tabletennis', 'badminton'].map(s => (
            <button key={s} type="button" onClick={() => setFormData({...formData, sport: s})}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all shrink-0 ${formData.sport === s ? 'bg-accent text-ink-900 border-accent glow-accent' : 'bg-white/5 border-white/10 text-ink-500'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="glass p-6 rounded-[2.5rem] border border-white/10 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setFormData({...formData, result: 'win'})}
              className={`py-4 rounded-2xl font-black italic uppercase transition-all border-2 ${formData.result === 'win' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 text-ink-700'}`}>
              Victory
            </button>
            <button type="button" onClick={() => setFormData({...formData, result: 'loss'})}
              className={`py-4 rounded-2xl font-black italic uppercase transition-all border-2 ${formData.result === 'loss' ? 'border-spark bg-spark/10 text-spark' : 'border-white/5 text-ink-700'}`}>
              Defeat
            </button>
          </div>

          <input className="w-full bg-white/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-accent" placeholder="Venue Name (e.g. Court 7)" 
            onChange={e => setFormData({...formData, court_name: e.target.value})} required />

          <div className="grid grid-cols-2 gap-4">
            <input className="bg-white/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-accent" placeholder="Score (6-2, 6-4)"
              onChange={e => setFormData({...formData, score: e.target.value})} />
            <input className="bg-white/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-accent" placeholder="Vs @Opponent"
              onChange={e => setFormData({...formData, opponent_name: e.target.value})} />
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] font-black uppercase text-ink-600">Intensity</span>
            <div className="flex gap-2">
              {['Low', 'Med', 'High'].map(i => (
                <button key={i} type="button" onClick={() => setFormData({...formData, intensity: i})}
                  className={`text-[9px] font-bold px-3 py-1 rounded-full border ${formData.intensity === i ? 'bg-accent text-ink-900 border-accent' : 'border-white/10 text-ink-500'}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button disabled={loading} className="w-full bg-accent text-ink-900 font-display font-bold py-5 rounded-[2.5rem] glow-accent uppercase italic tracking-tighter text-xl flex items-center justify-center gap-2">
          <Share2 size={20}/> {loading ? 'Syncing...' : 'Post to Feed & Save'}
        </button>
      </form>
    </div>
  )
}