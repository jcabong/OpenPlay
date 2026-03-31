import { NavLink, useLocation } from 'react-router-dom'
import { Home, PlusCircle, Trophy, User } from 'lucide-react'

const tabs = [
  { to: '/',            label: 'Feed',        Icon: Home },
  { to: '/log',         label: 'Log',         Icon: PlusCircle },
  { to: '/leaderboard', label: 'Ranks',       Icon: Trophy },
  { to: '/profile',     label: 'Profile',     Icon: User },
]

export default function Layout({ children }) {
  return (
    <div className="flex flex-col h-full bg-ink-900">
      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 glass border-t border-white/5 nav-safe-bottom">
        <div className="flex items-center justify-around px-2 pt-2">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-accent'
                    : 'text-ink-400 hover:text-ink-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-accent' : ''}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
