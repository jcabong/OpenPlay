import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, Eye, Trash2, Edit2, PlusCircle, Loader2, Users } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auditLogs, setAuditLogs] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedLog, setExpandedLog] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [user])

  async function checkAdmin() {
    if (!user) {
      navigate('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      navigate('/')
      alert('Access denied. Admin only.')
      return
    }

    setIsAdmin(true)
    await loadAdmins()
    await loadAuditLogs()
  }

  async function loadAdmins() {
    const { data } = await supabase
      .from('users')
      .select('username, display_name, avatar_url')
      .eq('role', 'admin')
    
    setAdmins(data || [])
  }

  async function loadAuditLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('game_audit_log')
      .select('*, users!game_audit_log_user_id_fkey(username, display_name)')
      .order('timestamp', { ascending: false })
      .limit(50)

    setAuditLogs(data || [])
    setLoading(false)
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'DELETE': return <Trash2 size={14} className="text-spark" />
      case 'EDIT': return <Edit2 size={14} className="text-accent" />
      case 'CREATE': return <PlusCircle size={14} className="text-green-500" />
      default: return <Eye size={14} className="text-ink-500" />
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'DELETE': return 'bg-spark/10 border-spark/20 text-spark'
      case 'EDIT': return 'bg-accent/10 border-accent/20 text-accent'
      case 'CREATE': return 'bg-green-500/10 border-green-500/20 text-green-500'
      default: return 'bg-ink-700/50 border-white/10 text-ink-400'
    }
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={28} className="text-accent" />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Admin Panel</h1>
        </div>
        <p className="text-xs text-ink-500 ml-1">Audit Logs & Moderation Center</p>
      </div>

      {/* Admins Section */}
      <div className="px-5 mb-6">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-ink-400">Administrators</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {admins.map(admin => (
              <div key={admin.username} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-black">
                  {admin.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-accent">@{admin.username}</p>
                  {admin.display_name && (
                    <p className="text-[9px] text-ink-500">{admin.display_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Eye size={14} className="text-accent" />
            Recent Activity
          </h2>
          <button 
            onClick={loadAuditLogs}
            className="text-[10px] font-bold text-ink-500 hover:text-accent transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-20 text-ink-600 text-xs font-black uppercase tracking-widest">
            No audit logs yet
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className="text-xs font-bold uppercase">{log.action}</span>
                      <span className="text-[10px] text-ink-500">
                        by @{log.users?.username || 'unknown'}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="text-xs text-ink-400 space-y-1">
                    <p>Game ID: <span className="text-ink-300 font-mono text-[10px]">{log.game_id}</span></p>
                    
                    {log.old_data && (
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="text-accent text-[10px] font-bold mt-2 hover:underline"
                      >
                        {expandedLog === log.id ? '▼ Hide Details' : '▶ View Details'}
                      </button>
                    )}
                    
                    {expandedLog === log.id && log.old_data && (
                      <div className="mt-3 p-3 rounded-lg bg-black/30 text-[10px] overflow-x-auto">
                        <pre className="whitespace-pre-wrap font-mono">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                        {log.new_data && (
                          <>
                            <div className="h-px bg-white/10 my-2" />
                            <pre className="whitespace-pre-wrap font-mono">
                              → {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}