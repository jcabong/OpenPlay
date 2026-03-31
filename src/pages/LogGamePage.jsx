import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Trophy, Target, MapPin, Users, Activity } from 'lucide-react'

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    court_name: '',
    result: 'win',
    score: '',
    sport: 'basketball',
    opponent_name: '',
    location_name: ''
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('games').insert([{ 
      user_id: user.id, 
      ...formData,
      created_at: new Date()
    }])
    if (error) alert(error.message)
    else navigate('/profile')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <h1 className="text-3xl font-display font-bold italic uppercase mb-8">Record Activity</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sport Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['basketball', 'volleyball', 'pickleball', 'football'].map(s => (
            <button key={s} type="button" onClick={() => setFormData({...formData, sport: s})}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all shrink-0 ${formData.sport === s ? 'bg-accent text-ink-900 border-accent' : 'bg-white/5 border-white/10 text-ink-500'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="glass p-6 rounded-[2rem] border border-white/10 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-black text-ink-600 mb-2 block">Court / Venue</label>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4">
              <MapPin size={16} className="text-ink-600"/>
              <input className="bg-transparent border-none w-full py-3 text-sm focus:ring-0" placeholder="e.g. Titan Court" 
                onChange={e => setFormData({...formData, court_name: e.target.value, location_name: e.target.value})} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-ink-600 mb-2 block">Final Score</label>
              <input className="bg-white/5 border-none rounded-xl w-full py-3 px-4 text-sm focus:ring-0" placeholder="21-15"
                onChange={e => setFormData({...formData, score: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-ink-600 mb-2 block">Opponent</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4">
                <Users size={16} className="text-ink-600"/>
                <input className="bg-transparent border-none w-full py-3 text-sm focus:ring-0" placeholder="@handle"
                  onChange={e => setFormData({...formData, opponent_name: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setFormData({...formData, result: 'win'})}
            className={`p-5 rounded-[2rem] font-black italic uppercase transition-all border-2 ${formData.result === 'win' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 text-ink-700'}`}>
            Victory
          </button>
          <button type="button" onClick={() => setFormData({...formData, result: 'loss'})}
            className={`p-5 rounded-[2rem] font-black italic uppercase transition-all border-2 ${formData.result === 'loss' ? 'border-spark bg-spark/10 text-spark' : 'border-white/5 text-ink-700'}`}>
            Defeat
          </button>
        </div>

        <button disabled={loading} className="w-full bg-accent text-ink-900 font-display font-bold py-5 rounded-[2rem] glow-accent uppercase italic tracking-tighter text-xl">
          {loading ? 'Syncing...' : 'Complete Session'}
        </button>
      </form>
    </div>
  )
}