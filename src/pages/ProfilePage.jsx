import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function getProfile() {
      const { data } = await supabase.from('users').select('username, name').eq('id', user.id).single()
      setProfile(data)
    }
    getProfile()
  }, [user])

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-6">
      <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center text-ink-900 font-bold text-3xl mb-4">
        {profile?.username?.charAt(0).toUpperCase()}
      </div>
      <h1 className="text-2xl font-display font-bold">@{profile?.username}</h1>
      <p className="text-ink-500 text-sm mb-6">{profile?.name}</p>

      <div className="flex gap-6 mb-8 py-4 border-y border-white/5">
        <div><p className="font-bold">0</p><p className="text-[10px] text-ink-500 uppercase">Followers</p></div>
        <div><p className="font-bold">0</p><p className="text-[10px] text-ink-500 uppercase">Following</p></div>
      </div>

      <button onClick={signOut} className="w-full py-3 glass rounded-xl text-spark font-bold">Logout</button>
    </div>
  )
}