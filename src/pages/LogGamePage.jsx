import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Trophy, Target, MapPin } from 'lucide-react'

export default function LogGamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    court_name: '',
    result: 'win', // Default to win for leaderboard testing
    score: ''
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('games')
      .insert([{ 
        user_id: user.id, 
        court_name: formData.court_name,
        result: formData.result.toLowerCase(), // Ensure lowercase 'win'
        score: formData.score,
        created_at: new Date()
      }])

    if (error) {
      alert(error.message)
    } else {
      navigate('/profile')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6 pb-24">
      <h1 className="text-3xl font-display font-bold italic uppercase mb-8">Log Match</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass p-6 rounded-[2rem] border border-white/10">
          <label className="text-[10px] uppercase font-black text-ink-500 tracking-widest mb-2 block">Court Name</label>
          <input 
            className="w-full bg-white/5 border-none rounded-xl text-ink-50 focus:ring-accent"
            placeholder="e.g. Sunset Park"
            required
            onChange={(e) => setFormData({...formData, court_name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setFormData({...formData, result: 'win'})}
            className={`p-4 rounded-2xl font-bold border-2 transition-all ${formData.result === 'win' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 text-ink-500'}`}
          >
            WIN
          </button>
          <button 
            type="button"
            onClick={() => setFormData({...formData, result: 'loss'})}
            className={`p-4 rounded-2xl font-bold border-2 transition-all ${formData.result === 'loss' ? 'border-spark bg-spark/10 text-spark' : 'border-white/5 text-ink-500'}`}
          >
            LOSS
          </button>
        </div>

        <button 
          disabled={loading}
          className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl glow-accent"
        >
          {loading ? 'Recording...' : 'Save Result'}
        </button>
      </form>
    </div>
  )
}