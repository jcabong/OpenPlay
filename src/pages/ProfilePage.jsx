import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, SPORTS } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { MapPin, Trophy, Edit2, Trash2, X, Save, Calendar, Swords, Loader2, AlertTriangle } from 'lucide-react'

function MatchRow({ game, onEdit, onDelete, isOwnProfile, canModify }) {
  const sport = SPORTS.find(s => s.id === game.sport)
  const isWin = game.result === 'win'
  const isLocked = !canModify
  
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none group">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${isWin ? 'bg-accent/10' : 'bg-spark/10'}`}>
        {sport?.emoji || '🏸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-100 truncate">
          {sport?.label}
          {game.opponent_name && (
            <span className="text-ink-500 font-normal"> vs {game.opponent_name}</span>
          )}
        </p>
        {game.court_name && (
          <p className="text-[9px] text-ink-600 font-bold flex items-center gap-0.5 mt-0.5">
            <MapPin size={8} />{game.court_name}{game.city ? ` · ${game.city}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black uppercase ${isWin ? 'text-accent' : 'text-spark'}`}>
          {isWin ? 'WIN' : 'LOSS'}
        </p>
        {game.score && <p className="text-[10px] text-ink-500">{game.score}</p>}
        <p className="text-[9px] text-ink-700 mt-0.5">
          {new Date(game.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </p>
        {isLocked && (
          <p className="text-[8px] text-ink-600 mt-1">🔒 Locked</p>
        )}
      </div>
      {isOwnProfile && canModify && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(game)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-ink-500 hover:text-accent"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(game)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-ink-500 hover:text-spark"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function EditMatchModal({ game, onClose, onSave }) {
  const [formData, setFormData] = useState({
    score: game.score || '',
    result: game.result,
    sport: game.sport,
    court_name: game.court_name || '',
    city: game.city || '',
    province: game.province || '',
  })
  const [saving, setSaving] = useState(false)

  const recalculateUserStats = async (userId) => {
    const { data: games } = await supabase
      .from('games')
      .select('result')
      .eq('user_id', userId)
      .eq('is_deleted', false)
    
    const totalWins = games?.filter(g => g.result === 'win').length || 0
    
    await supabase
      .from('users')
      .update({ total_wins: totalWins })
      .eq('id', userId)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Log the edit
      await supabase
        .from('game_audit_log')
        .insert({
          game_id: game.id,
          user_id: user.id,
          action: 'EDIT',
          old_data: game,
          new_data: formData,
          timestamp: new Date().toISOString()
        })
      
      // 1. Update your game
      await supabase
        .from('games')
        .update({
          score: formData.score,
          result: formData.result,
          sport: formData.sport,
          court_name: formData.court_name,
          city: formData.city,
          province: formData.province,
          edited_at: new Date().toISOString(),
        })
        .eq('id', game.id)
      
      // 2. Update opponent's game if tagged
      if (game.tagged_opponent_id) {
        const opponentResult = formData.result === 'win' ? 'loss' : 'win'
        
        await supabase
          .from('games')
          .update({
            score: formData.score,
            result: opponentResult,
            sport: formData.sport,
            court_name: formData.court_name,
            city: formData.city,
            province: formData.province,
            edited_at: new Date().toISOString(),
          })
          .eq('user_id', game.tagged_opponent_id)
          .eq('tagged_opponent_id', user.id)
          .eq('created_at', game.created_at)
      }
      
      // 3. Update associated post
      const sportEmoji = SPORTS.find(s => s.id === formData.sport)?.emoji || '🏆'
      const updatedContent = `${sportEmoji} Updated match: ${formData.result.toUpperCase()} (${formData.score || '—'}) vs ${game.opponent_name}`
      
      await supabase
        .from('posts')
        .update({
          content: updatedContent,
          sport: formData.sport,
          location_name: formData.court_name,
          city: formData.city,
          province: formData.province,
          edited_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
      
      // 4. Recalculate stats
      await recalculateUserStats(user.id)
      if (game.tagged_opponent_id) {
        await recalculateUserStats(game.tagged_opponent_id)
      }
      
      alert('✅ Match updated successfully!')
      onSave()
      onClose()
    } catch (err) {
      console.error('Edit error:', err)
      alert('Error updating match: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-ink-800 rounded-2xl max-w-md w-full p-6 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Match</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 block mb-2">Sport</label>
            <div className="flex gap-2 flex-wrap">
              {SPORTS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, sport: s.id })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    formData.sport === s.id
                      ? 'bg-accent text-ink-900'
                      : 'bg-white/5 text-ink-400 hover:bg-white/10'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 block mb-2">Score</label>
            <input
              type="text"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="e.g., 21-15, 21-18"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 block mb-2">Result</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormData({ ...formData, result: 'win' })}
                className={`py-3 rounded-xl font-bold uppercase transition-all ${
                  formData.result === 'win'
                    ? 'bg-accent text-ink-900'
                    : 'bg-white/5 text-ink-400 hover:bg-white/10'
                }`}
              >
                Win
              </button>
              <button
                onClick={() => setFormData({ ...formData, result: 'loss' })}
                className={`py-3 rounded-xl font-bold uppercase transition-all ${
                  formData.result === 'loss'
                    ? 'bg-spark text-white'
                    : 'bg-white/5 text-ink-400 hover:bg-white/10'
                }`}
              >
                Loss
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 block mb-2">Court / Location</label>
            <input
              type="text"
              value={formData.court_name}
              onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
              placeholder="Court name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white mb-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
              />
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Province"
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 text-ink-400 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-accent text-ink-900 font-bold flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ game, onClose, onConfirm, trustScore }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-ink-800 rounded-2xl max-w-md w-full p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4 text-spark">
          <AlertTriangle size={24} />
          <h2 className="text-xl font-bold">Delete Match?</h2>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-ink-300 text-sm">
            This will permanently delete your match vs <strong>{game.opponent_name}</strong>.
          </p>
          
          <div className="bg-spark/10 border border-spark/20 rounded-xl p-3">
            <p className="text-xs font-bold text-spark mb-2">⚠️ RANKING IMPACT</p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>• This {game.result.toUpperCase()} will be removed from your record</li>
              <li>• Your win rate and ranking will be affected</li>
              <li>• Your trust score will decrease by 10 points</li>
              <li>• Current trust score: <span className="text-accent font-bold">{trustScore}</span> → <span className="text-spark font-bold">{Math.max(0, trustScore - 10)}</span></li>
            </ul>
          </div>
          
          {game.tagged_opponent_id && (
            <p className="text-xs text-ink-500">
              Your opponent's match will also be deleted.
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-ink-400 font-bold">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-spark text-white font-bold">
            Delete Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGame, setEditingGame] = useState(null)
  const [deletingGame, setDeletingGame] = useState(null)
  const [trustScore, setTrustScore] = useState(100)
  const [recentDeletions, setRecentDeletions] = useState(0)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadGames()
    loadUserStats()
  }, [user])

  async function loadUserStats() {
    const { data: userData } = await supabase
      .from('users')
      .select('trust_score, deleted_matches_count')
      .eq('id', user.id)
      .single()
    
    if (userData) {
      setTrustScore(userData.trust_score || 100)
    }
    
    // Count recent deletions (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: deletions } = await supabase
      .from('games')
      .select('deleted_at')
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .gte('deleted_at', weekAgo)
    
    setRecentDeletions(deletions?.length || 0)
  }

  async function loadGames() {
    setLoading(true)
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    
    setGames(data || [])
    setLoading(false)
  }

  const canModifyMatch = (createdAt) => {
    const matchDate = new Date(createdAt)
    const now = new Date()
    const hoursSince = (now - matchDate) / 1000 / 60 / 60
    const canModify = hoursSince <= 48
    return canModify
  }

  async function handleDeleteGame(game) {
    const matchDate = new Date(game.created_at)
    const now = new Date()
    const hoursSince = (now - matchDate) / 1000 / 60 / 60
    
    // Rule 1: Can't delete matches older than 48 hours
    if (hoursSince > 48) {
      alert(`⚠️ Cannot delete matches older than 48 hours.\n\nMatch date: ${matchDate.toLocaleDateString()}\nIf this match is incorrect, please contact support.`)
      return
    }
    
    // Rule 2: Can't delete more than 2 matches per week
    if (recentDeletions >= 2) {
      alert(`⚠️ You have already deleted ${recentDeletions} matches this week.\n\nMaximum 2 deletions per week allowed to maintain fair rankings.`)
      return
    }
    
    try {
      // Log deletion
      await supabase.from('game_audit_log').insert({
        game_id: game.id,
        user_id: user.id,
        action: 'DELETE',
        old_data: game,
        timestamp: new Date().toISOString()
      })
      
      // Soft delete your game
      await supabase
        .from('games')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', game.id)
      
      // Soft delete opponent's game if tagged
      if (game.tagged_opponent_id) {
        await supabase
          .from('games')
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
          })
          .eq('user_id', game.tagged_opponent_id)
          .eq('tagged_opponent_id', user.id)
          .eq('created_at', game.created_at)
      }
      
      // Delete associated post
      await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('game_id', game.id)
      
      // Update trust score
      await supabase.rpc('decrease_trust_score', { user_uuid: user.id })
      
      alert('✅ Match deleted. Rankings updated. Your trust score has been adjusted.')
      loadGames()
      loadUserStats()
      setDeletingGame(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error deleting match. Please contact support.')
    }
  }

  const totalWins = games.filter(g => g.result === 'win').length
  const totalMatches = games.length
  const winRate = totalMatches ? Math.round(totalWins / totalMatches * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">My Profile</h1>
      </div>

      {/* Trust Score Banner */}
      {trustScore < 70 && (
        <div className="mx-5 mb-4 p-3 rounded-xl bg-spark/10 border border-spark/20">
          <p className="text-xs text-spark font-bold flex items-center gap-2">
            <AlertTriangle size={14} />
            Low Trust Score ({trustScore}) - Excessive deletions affect ranking integrity
          </p>
        </div>
      )}

      <div className="px-5 pb-4">
        <div className="w-20 h-20 rounded-[1.5rem] bg-accent flex items-center justify-center font-bold text-ink-900 text-3xl mb-3">
          {(profile?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <h1 className="font-display text-2xl font-bold italic uppercase tracking-tighter text-white">
          {profile?.display_name || `@${profile?.username}`}
        </h1>
        <p className="text-accent text-sm font-bold mt-0.5">@{profile?.username}</p>
        
        {/* Trust Score Display */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${trustScore}%` }} />
          </div>
          <span className="text-[10px] font-bold text-ink-500">Trust: {trustScore}</span>
        </div>
        
        {(profile?.city || profile?.region) && (
          <div className="flex items-center gap-1.5 text-ink-500 text-xs font-bold mt-3">
            <MapPin size={11} className="text-accent" />
            {[profile?.city, profile?.region].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{totalWins}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Wins</p>
        </div>
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{winRate}%</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Win Rate</p>
        </div>
        <div className="glass p-3.5 rounded-[1.25rem] border border-white/5 text-center">
          <p className="font-display text-2xl font-bold text-accent italic">{totalMatches}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-ink-600 mt-1">Matches</p>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-accent" />
          Match History
          {recentDeletions > 0 && (
            <span className="text-[9px] text-spark ml-2">
              ({recentDeletions}/2 deletions this week)
            </span>
          )}
        </h2>
        {games.length === 0 ? (
          <div className="text-center py-14 text-ink-600 text-xs font-black uppercase tracking-widest">
            No matches yet
          </div>
        ) : (
          <div className="glass rounded-[2rem] border border-white/10 overflow-hidden">
            {games.map(game => (
              <MatchRow
                key={game.id}
                game={game}
                isOwnProfile={true}
                canModify={canModifyMatch(game.created_at)}
                onEdit={setEditingGame}
                onDelete={setDeletingGame}
              />
            ))}
          </div>
        )}
      </div>

      {editingGame && (
        <EditMatchModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSave={loadGames}
        />
      )}

      {deletingGame && (
        <DeleteConfirmModal
          game={deletingGame}
          trustScore={trustScore}
          onClose={() => setDeletingGame(null)}
          onConfirm={() => handleDeleteGame(deletingGame)}
        />
      )}
    </div>
  )
}