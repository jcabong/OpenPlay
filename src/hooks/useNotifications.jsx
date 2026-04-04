import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const pollRef                           = useRef(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription — works if WebSocket is available
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchNotifications())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime connected — clear polling fallback
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Realtime failed — start polling every 15s as fallback
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchNotifications, 15000)
          }
        }
      })

    // Also start polling immediately as a safety net
    // (will be cleared if realtime connects successfully)
    pollRef.current = setInterval(fetchNotifications, 15000)

    return () => {
      supabase.removeChannel(channel)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [userId, fetchNotifications])

  async function markAllRead() {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return { notifications, unreadCount, markAllRead, markOneRead, refetch: fetchNotifications }
}

// ── Helper: send a notification ───────────────────────────────────────────────
export async function sendNotification({ userId, type, title, body, data = {} }) {
  if (!userId) return
  const { error } = await supabase.from('notifications').insert([{
    user_id:    userId,
    type,
    title,
    body,
    data,
    is_read:    false,
    created_at: new Date().toISOString(),
  }])
  if (error) console.error('sendNotification error:', error.message)
}

// ── Helper: extract @mentions and notify each user ────────────────────────────
export async function notifyMentions({ text, fromUser, postId, commentId }) {
  if (!text || !fromUser?.username) return
  const mentionHandles = [...new Set((text.match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase()))]
  if (!mentionHandles.length) return

  const { data: mentionedUsers, error } = await supabase
    .from('users')
    .select('id, username')
    .in('username', mentionHandles)

  if (error) { console.error('notifyMentions lookup error:', error.message); return }
  if (!mentionedUsers?.length) return

  const rows = mentionedUsers
    .filter(u => u.id !== fromUser.id)
    .map(u => ({
      user_id:    u.id,
      type:       commentId ? 'mention_comment' : 'mention_post',
      title:      `@${fromUser.username} mentioned you`,
      body:       text.length > 80 ? text.slice(0, 80) + '…' : text,
      data:       { from_username: fromUser.username, post_id: postId, comment_id: commentId || null },
      is_read:    false,
      created_at: new Date().toISOString(),
    }))

  if (rows.length) {
    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) console.error('notifyMentions insert error:', insertError.message)
  }
}
