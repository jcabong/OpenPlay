import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (username.length < 3) return setError('Username too short')
    
    setLoading(true)
    setError('')

    // Update the user profile in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ username: username.toLowerCase().trim() })
      .eq('id', user.id)

    if (updateError) {
      if (updateError.message.includes('unique')) {
        setError('This username is already taken!')
      } else {
        setError('Error saving username. Try again.')
      }
      setLoading(false)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-ink-900 flex items-center justify-center p-6">
      <div className="glass rounded-[2.5rem] p-8 w-full max-w-md border border-white/10 shadow-2xl text-center">
        <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center font-display font-bold text-ink-900 text-3xl mx-auto mb-6 glow-accent">
          ?
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">Claim your @username</h2>
        <p className="text-ink-500 text-sm mb-8">You need a unique handle to post on the feed and join the leaderboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-bold">@</span>
            <input
              type="text"
              placeholder="username"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-ink-50 focus:border-accent/50 focus:outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              required
            />
          </div>

          {error && <p className="text-spark text-xs font-bold uppercase tracking-wider">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-ink-900 font-display font-bold py-4 rounded-2xl hover:bg-accent/90 disabled:opacity-50 transition-all glow-accent"
          >
            {loading ? 'Setting up...' : 'Start Playing'}
          </button>
        </form>
      </div>
    </div>
  )
}