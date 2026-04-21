import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Bell, AtSign, Calendar, MessageCircle, Check } from 'lucide-react'

const TYPE_CONFIG = {
  mention_post:    { icon: AtSign,        color: '#c8ff00', label: 'Mentioned you in a post'    },
  mention_comment: { icon: MessageCircle, color: '#60a5fa', label: 'Mentioned you in a comment' },
  event_update:    { icon: Calendar,      color: '#f59e0b', label: 'Event updated'              },
  event_reminder:  { icon: Calendar,      color: '#a78bfa', label: 'Event reminder'             },
  tagged_match:    { icon: AtSign,        color: '#f472b6', label: 'Tagged in a match'          },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export default function NotificationsPanel({ notifications, onMarkAllRead, onMarkOneRead, onClose }) {

  // Mark all read when panel opens
  useEffect(() => {
    const unread = notifications.some(n => !n.is_read)
    if (unread) {
      const timer = setTimeout(() => onMarkAllRead(), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function getLinkForNotification(n) {
    if (n.data?.post_id) return `/?post=${n.data.post_id}`
    if (n.data?.event_id) return `/events`
    if (n.data?.from_username) return `/user/${n.data.from_username}`
    return '/'
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Panel — slides up on mobile, fixed panel on desktop */}
      <div className="fixed z-50 bottom-0 left-0 right-0 lg:bottom-auto lg:top-16 lg:right-4 lg:left-auto lg:w-96
        rounded-t-[2rem] lg:rounded-[2rem] border-t lg:border border-white/10 overflow-hidden"
        style={{ background: '#0f0f1a', maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: '#c8ff00' }} />
            <p className="font-black text-white text-sm uppercase tracking-widest">Notifications</p>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <button onClick={onMarkAllRead}
                className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg"
                style={{ color: '#c8ff00', background: 'rgba(200,255,0,0.08)' }}>
                <Check size={10} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <Bell size={32} style={{ color: 'rgba(255,255,255,0.1)' }} className="mb-3" />
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No notifications yet
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                You'll see mentions and updates here
              </p>
            </div>
          ) : (
            notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.mention_post
              const Icon = cfg.icon
              return (
                <Link
                  key={n.id}
                  to={getLinkForNotification(n)}
                  onClick={() => { onMarkOneRead(n.id); onClose() }}
                  className="flex items-start gap-3 px-5 py-4 border-b border-white/5 hover:bg-white/3 transition-colors"
                  style={{ background: n.is_read ? 'transparent' : 'rgba(200,255,0,0.03)' }}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${cfg.color}18` }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-[11px] mt-0.5 leading-relaxed line-clamp-2"
                        style={{ color: 'rgba(255,255,255,0.5)' }}>{n.body}</p>
                    )}
                    <p className="text-[10px] mt-1 font-bold"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#c8ff00' }} />
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
