import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Share2, Loader2 } from 'lucide-react'

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
    intensity: 'Med',
    mood: '🔥'
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    
    // 1. Log the Game with all columns
    const { error: gameError } = await supabase.from('games').insert([{ 
      user_id: user.id, 
      ...formData,
      created_at: new Date()
    }])

    if (gameError) {
      alert("Error: " + gameError.message)
    } else {
      // 2. Create Global Feed Post
      await supabase.from('posts').insert([{
        user_id: user.id,
        content: `🎾 Played ${formData.sport} at ${formData.court_name}. Score: ${formData.score}. Opponent: ${formData.opponent_name}`,
        location_name: formData.court_name,
        sport: formData.sport
      }])
      navigate('/profile')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <h1 className="text-3xl font-display font-bold italic uppercase mb-8">Record Match</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['tennis', 'pickleball', 'golf', 'tabletennis', 'badminton'].map(s => (
            <button key={s} type="button" onClick={() => setFormData({...formData, sport: s})}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border shrink-0 ${formData.sport === s ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="glass p-6 rounded-[2.5rem] border border-white/10 space-y-4">
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5">
            <MapPin size={18} className="text-ink-600" />
            <input className="bg-transparent border-none w-full py-4 text-sm focus:ring-0" placeholder="Tag Location (e.g. Center Court)" 
              value={formData.court_name} onChange={e => setFormData({...formData, court_name: e.target.value})} required />
          </div>

          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5">
            <Users size={18} className="text-ink-600" />
            <input className="bg-transparent border-none w-full py-4 text-sm focus:ring-0" placeholder="Tag Opponent (e.g. @player)" 
              value={formData.opponent_name} onChange={e => setFormData({...formData, opponent_name: e.target.value})} />
          </div>

          <input className="w-full bg-white/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-accent" placeholder="Score (e.g. 6-2, 6-4)"
            value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {['win', 'loss'].map(res => (
            <button key={res} type="button" onClick={() => setFormData({...formData, result: res})}
              className={`py-4 rounded-2xl font-black uppercase italic border-2 transition-all ${formData.result === res ? (res === 'win' ? 'border-accent text-accent bg-accent/5' : 'border-spark text-spark bg-spark/5') : 'border-white/5 text-ink-700'}`}>
              {res}
            </button>
          ))}
        </div>

        <button disabled={loading} className="w-full bg-accent text-ink-900 font-display font-bold py-5 rounded-[2.5rem] glow-accent uppercase italic tracking-tighter text-xl flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <><Share2 size={20}/> Post & Save</>}
        </button>
      </form>
    </div>
  )
}