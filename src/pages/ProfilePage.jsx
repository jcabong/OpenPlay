import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Activity, MapPin, Trash2, Edit3, Check, BarChart3, LayoutGrid } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [view, setView] = useState('highlights') // highlights, feed
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
    const { data: g } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    const { data: po } = await supabase.from('posts').select('*').eq('user_id', user.id).eq('is_deleted', false).order('inserted_at', { ascending: false })
    setProfile(p); setBio(p?.bio || ''); setGames(g || []); setPosts(po || [])
  }

  async function updateBio() {
    await supabase.from('users').update({ bio }).eq('id', user.id)
    setIsEditingBio(false); fetchData()
  }

  async function deletePost(id) {
    if (window.confirm("Delete this post?")) {
      await supabase.from('posts').update({ is_deleted: true }).eq('id', id)
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">
      {/* Header & Bio */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl glow-accent mb-4">
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">@{profile?.username}</h1>
        
        {isEditingBio ? (
          <div className="mt-2 w-full max-w-xs flex gap-2">
            <input value={bio} onChange={e => setBio(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs w-full focus:ring-accent" />
            <button onClick={updateBio} className="text-accent"><Check size={18}/></button>
          </div>
        ) : (
          <p className="text-ink-500 text-sm mt-1 italic flex items-center gap-2" onClick={() => setIsEditingBio(true)}>
            {profile?.bio || 'Add a bio...'} <Edit3 size={12}/>
          </p>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/5 mb-6">
        <button onClick={() => setView('highlights')} className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${view === 'highlights' ? 'text-accent border-b-2 border-accent' : 'text-ink-700'}`}>
          <BarChart3 size={14}/> Game Stats
        </button>
        <button onClick={() => setView('feed')} className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${view === 'feed' ? 'text-accent border-b-2 border-accent' : 'text-ink-700'}`}>
          <LayoutGrid size={14}/> My Posts
        </button>
      </div>

      {/* View Logic */}
      {view === 'highlights' ? (
        <div className="space-y-4">
          {games.map(game => (
            <div key={game.id} className="glass p-5 rounded-[2rem] border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 px-4 py-1 bg-accent/10 text-accent text-[8px] font-black uppercase italic rounded-bl-xl">
                {game.sport}
              </div>
              <p className="text-ink-600 text-[9px] font-black uppercase mb-1">{new Date(game.created_at).toLocaleDateString()}</p>
              <h3 className="text-xl font-display font-bold italic">{game.court_name}</h3>
              <div className="flex justify-between items-end mt-4">
                <div className="flex gap-4">
                  <div><p className="text-[8px] uppercase text-ink-700 font-black">Result</p><p className={`text-sm font-bold ${game.result === 'win' ? 'text-accent' : 'text-spark'}`}>{game.result.toUpperCase()}</p></div>
                  <div><p className="text-[8px] uppercase text-ink-700 font-black">Score</p><p className="text-sm font-bold">{game.score || '-'}</p></div>
                </div>
                <div className="text-right"><p className="text-[8px] uppercase text-ink-700 font-black">Vs</p><p className="text-sm font-bold">{game.opponent_name || 'Open'}</p></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="glass p-5 rounded-[2rem] border border-white/5">
              <div className="flex justify-between items-start">
                <p className="text-sm text-ink-100">{post.content}</p>
                <button onClick={() => deletePost(post.id)} className="text-ink-700 hover:text-spark ml-2"><Trash2 size={14}/></button>
              </div>
              <p className="text-[8px] text-ink-600 uppercase font-black mt-3">{new Date(post.inserted_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={signOut} className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest border border-spark/20">Sign Out</button>
    </div>
  )
}