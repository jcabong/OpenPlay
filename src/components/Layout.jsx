import { NavLink, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, Trophy, Calendar, User, LogOut, Menu, X, Bell } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import NotificationsPanel from './NotificationsPanel'

const navItems = [
  { to: '/',        label: 'Feed',      Icon: Home,       end: true },
  { to: '/log',     label: 'Log Match', Icon: PlusCircle, end: false },
  { to: '/ranks',   label: 'Ranks',     Icon: Trophy,     end: false },
  { to: '/events',  label: 'Events',    Icon: Calendar,   end: false },
  { to: '/profile', label: 'Profile',   Icon: User,       end: false },
]

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(user?.id)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const username = profile?.username || user?.email?.split('@')[0] || 'You'
  const initial = username.charAt(0).toUpperCase()
  const avatarColors = ['#c8ff00', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6']
  const avatarBg = avatarColors[(username.charCodeAt(0) || 0) % avatarColors.length]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)' }}>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:flex min-h-screen">

        {/* Left Sidebar */}
        <aside className="w-64 xl:w-72 shrink-0 fixed top-0 left-0 h-screen flex flex-col border-r z-30"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>

          {/* Logo */}
          <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
                style={{ background: '#c8ff00', color: '#0a0a0f' }}>OP</div>
              <div>
                <p className="font-black text-white text-lg leading-none tracking-tight">OpenPlay</p>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#c8ff00', opacity: 0.7 }}>Sports Network</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 group ${
                    isActive
                      ? 'text-black'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => isActive
                  ? { background: '#c8ff00', boxShadow: '0 0 20px rgba(200,255,0,0.3)' }
                  : {}
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom: notifications + user + sign out */}
          <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {/* Bell */}
            <button onClick={() => setShowNotifications(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all">
              <div className="relative">
                <Bell size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{ background: '#c8ff00', color: '#0a0a0f' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(200,255,0,0.15)', color: '#c8ff00' }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <NavLink
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                style={{ background: avatarBg, color: '#0a0a0f' }}>
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">@{username}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
              </div>
            </NavLink>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-red-500/10"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 xl:ml-72 min-h-screen">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>

        {/* Right sidebar — decorative / future widgets */}
        <aside className="w-80 shrink-0 hidden xl:block">
          <div className="sticky top-6 px-4 py-6 space-y-4">
            <div className="rounded-3xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#c8ff00', opacity: 0.8 }}>🏆 Quick Stats</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Log matches to see your stats here.</p>
            </div>
            <div className="rounded-3xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>🎾 Trending Sports</p>
              {['Badminton', 'Pickleball', 'Table Tennis', 'Tennis'].map(s => (
                <div key={s} className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-bold text-white">{s}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Active</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="lg:hidden">

        {/* Mobile top bar */}
        <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 border-b"
          style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
              style={{ background: '#c8ff00', color: '#0a0a0f' }}>OP</div>
            <span className="font-black text-white tracking-tight">OpenPlay</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bell */}
            <button onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: '#c8ff00', color: '#0a0a0f' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Mobile slide-out menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-72 h-full flex flex-col border-r"
              style={{ background: '#0a0a0f', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                    style={{ background: '#c8ff00', color: '#0a0a0f' }}>OP</div>
                  <span className="font-black text-white">OpenPlay</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* User info */}
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm"
                    style={{ background: avatarBg, color: '#0a0a0f' }}>{initial}</div>
                  <div>
                    <p className="font-black text-white text-sm">@{username}</p>
                    <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(({ to, label, Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                        isActive ? 'text-black' : 'text-white/50'
                      }`
                    }
                    style={({ isActive }) => isActive
                      ? { background: '#c8ff00' }
                      : {}
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Mobile main content */}
        <main className="pt-16 pb-20">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t"
          style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-around px-2 pt-2 pb-safe">
            {navItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? '' : 'opacity-40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative p-1.5 rounded-xl transition-all"
                      style={isActive ? { background: 'rgba(200,255,0,0.12)' } : {}}>
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8}
                        style={{ color: isActive ? '#c8ff00' : 'rgba(255,255,255,0.6)' }} />
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ background: '#c8ff00' }} />
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: isActive ? '#c8ff00' : 'rgba(255,255,255,0.4)' }}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* Notifications Panel — shared across mobile + desktop */}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  )
}
