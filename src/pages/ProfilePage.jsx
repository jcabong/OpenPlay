import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, Trash2, Edit3, Check, X, Loader2, Image, Video, MapPin } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingPostId, setEditingPostId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState(null)

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: g }, { data: po }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('posts').select('*').eq('user_id', user.id).order('inserted_at', { ascending: false })
    ])
    setProfile(p)
    setGames(g || [])
    setPosts(po || [])
    setLoading(false)
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Delete this post?')) return
    setDeletingPostId(postId)
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id)
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId))
    } else {
      alert('Failed to delete post: ' + error.message)
    }
    setDeletingPostId(null)
  }

  function startEdit(post) {
    setEditingPostId(post.id)
    setEditContent(post.content)
  }

  function cancelEdit() {
    setEditingPostId(null)
    setEditContent('')
  }

  async function saveEdit(postId) {
    if (!editContent.trim()) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('posts')
      .update({ content: editContent.trim() })
      .eq('id', postId)
      .eq('user_id', user.id)

    if (!error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p))
      setEditingPostId(null)
      setEditContent('')
    } else {
      alert('Failed to update post: ' + error.message)
    }
    setSavingEdit(false)
  }

  const winRate = games.length > 0
    ? ((games.filter(g => g.result === 'win').length / games.length) * 100).toFixed(0)
    : 0

  const wins = games.filter(g => g.result === 'win').length
  const losses = games.filter(g => g.result === 'loss').length

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-24 px-6 pt-12">

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center font-bold text-ink-900 text-3xl mb-4 glow-accent">
          {(profile?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-display font-bold uppercase italic">
          @{profile?.username || '...'}
        </h1>
        {profile?.name && (
          <p className="text-ink-500 text-xs mt-1">{profile.name}</p>
        )}
      </div>

      {/* Career Stats */}
      <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-10 bg-gradient-to-br from-white/5 to-transparent">
        <div className="col-span-2 flex justify-between items-center text-[10px] font-black uppercase text-ink-600 mb-4 pb-2 border-b border-white/5">
          <span>Career Stats</span>
          <Trophy size={14} className="text-accent" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-display font-bold text-accent">{winRate}%</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-court-400">{wins}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-spark">{losses}</p>
            <p className="text-[8px] uppercase font-black text-ink-600">Losses</p>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <h2 className="text-[10px] font-black uppercase text-ink-600 mb-4 ml-2 flex items-center gap-2">
        <Clock size={12} /> My Posts
      </h2>

      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-10 glass border-dashed border-white/10 rounded-3xl opacity-30 text-[10px] uppercase font-black">
            No posts yet — log a match to share to the feed!
          </div>
        )}

        {posts.map(post => (
          <div
            key={post.id}
            className="glass p-5 rounded-[2rem] border border-white/5 relative bg-white/[0.01]"
          >
            {/* Date + Action Buttons */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-ink-600 text-[8px] font-black uppercase">
                {new Date(post.inserted_at).toLocaleDateString()}
              </p>

              {editingPostId !== post.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(post)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-ink-500 hover:text-accent hover:border-accent/30 transition-all"
                    title="Edit post"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingPostId === post.id}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-ink-500 hover:text-spark hover:border-spark/30 transition-all disabled:opacity-50"
                    title="Delete post"
                  >
                    {deletingPostId === post.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                  </button>
                </div>
              )}
            </div>

            {/* Content — editable or static */}
            {editingPostId === post.id ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full bg-ink-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-accent/50 outline-none transition-colors resize-none"
                  autoFocus
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-ink-500 bg-white/5 border border-white/5 hover:text-ink-200 transition-colors"
                  >
                    <X size={11} /> Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(post.id)}
                    disabled={savingEdit || !editContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-ink-900 bg-accent border border-accent disabled:opacity-50 transition-colors"
                  >
                    {savingEdit
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Check size={11} />
                    }
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-100">{post.content}</p>
            )}

            {/* Media preview if present */}
            {post.media_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-white/5">
                {post.media_type === 'video' ? (
                  <video
                    src={post.media_url}
                    controls
                    className="w-full max-h-48 object-cover"
                    playsInline
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt="Post media"
                    className="w-full max-h-48 object-cover"
                  />
                )}
              </div>
            )}

            {/* Location tag */}
            {post.location_name && (
              <div className="mt-3 flex items-center gap-1 text-ink-500 text-[9px] font-bold uppercase">
                <MapPin size={10} className="text-accent" />
                {post.location_name}
              </div>
            )}

            {/* Sport badge */}
            {post.sport && (
              <div className="mt-2">
                <span className="text-[8px] font-black uppercase bg-accent/10 text-accent px-2 py-1 rounded-md border border-accent/20">
                  {post.sport}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        className="w-full py-4 glass rounded-2xl text-spark font-bold mt-12 text-xs uppercase tracking-widest hover:bg-spark/5 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
