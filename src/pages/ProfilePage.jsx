import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Users } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ followers: 0, following: 0 })

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from('users')
        .select('username, name, avatar_url') // Notice EMAIL is not selected
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    fetchProfile()
  }, [user])

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6">
      <div className="flex justify-between items-start mb-8">
        <div className="w-24 h-24 bg-accent rounded-3xl flex items-center justify-center font-display font-bold text-ink-900 text-4xl glow-accent">
          {profile?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <button onClick={signOut} className="p-3 glass rounded-2xl text-spark border-spark/20"><LogOut size={20}/></button>
      </div>

      <h1 className="text-3xl font-display font-bold mb-1">@{profile?.username || 'player'}</h1>
      <p className="text-ink-500 text-sm mb-6">{profile?.name || 'OpenPlay Athlete'}</p>

      {/* Follower Stats */}
      <div className="flex gap-8 mb-8 border-y border-white/5 py-4">
        <div><p className="text-xl font-display font-bold text-ink-50">0</p><p className="text-[10px] uppercase text-ink-500 font-bold tracking-widest">Followers</p></div>
        <div><p className="text-xl font-display font-bold text-ink-50">0</p><p className="text-[10px] uppercase text-ink-500 font-bold tracking-widest">Following</p></div>
      </div>
      
      <div className="text-center py-10 glass rounded-3xl border border-dashed border-white/10">
        <p className="text-ink-500">Your logged games will appear here</p>
      </div>
    </div>
  )
}