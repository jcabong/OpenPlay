import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PostCard from '../components/PostCard'
import GameCard from '../components/GameCard'
import { Loader2, Settings, MapPin, Calendar, Edit3 } from 'lucide-react'

export default function ProfilePage() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts') // 'posts' or 'matches'

  const isOwnProfile = currentUser?.id === profile?.id

  async function fetchProfileData() {
    setLoading(true)
    // 1. Get User Profile
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (userData) {
      setProfile(userData)
      
      // 2. Get Posts
      const { data: userPosts } = await supabase
        .from('posts')
        .select('*, author:users!posts_author_id_fkey(*), likes(*), comments(*)')
        .eq('author_id', userData.id)
        .order('created_at', { ascending: false })
      setPosts(userPosts || [])

      // 3. Get Games/Matches
      const { data: userGames } = await supabase
        .from('games')
        .select('*, users(*)')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
      setGames(userGames || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfileData()
  }, [username])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>

  return (
    <div className="pb-20">
      {/* Header/Cover Area */}
      <div className="h-32 bg-gradient-to-r from-ink-800 to-ink-900" />
      
      <div className="px-4 -mt-12 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div className="w-24 h-24 rounded-[2rem] bg-ink-700 border-4 border-ink-900 overflow-hidden shadow-xl">
            <div className="w-full h-full flex items-center justify-center text-3xl bg-accent text-ink-900 font-black">
              {profile?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
          
          {isOwnProfile && (
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white text-ink-900 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-accent transition-colors">
              <Edit3 size={14} />
              Edit Profile
            </button>
          )}
        </div>

        <h1 className="text-2xl font-black text-ink-50">@{profile?.username}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-ink-400 text-xs font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><MapPin size={12}/> {profile?.city}, {profile?.region}</span>
          <span className="flex items-center gap-1"><Calendar size={12}/> Joined 2024</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-4 px-4 gap-8">
        {['posts', 'matches'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${
              tab === t ? 'text-accent border-b-2 border-accent' : 'text-ink-500'
            }`}
          >
            {t === 'posts' ? 'Posts' : 'Match Logs'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="px-4">
        {tab === 'posts' ? (
          posts.length > 0 ? (
            posts.map(p => <PostCard key={p.id} post={p} user={currentUser} onRefresh={fetchProfileData} />)
          ) : (
            <p className="text-center text-ink-500 py-10 text-xs uppercase font-bold">No posts yet</p>
          )
        ) : (
          games.length > 0 ? (
            games.map(g => <GameCard key={g.id} game={g} />)
          ) : (
            <p className="text-center text-ink-500 py-10 text-xs uppercase font-bold">No matches logged</p>
          )
        )}
      </div>
    </div>
  )
}