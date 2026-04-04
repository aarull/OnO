import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initials, avatarColor, cn } from '../../lib/utils'

interface SidebarItem {
  label: string
  icon: string
  path: string
  badge?: number
}

interface SidebarProps {
  items: SidebarItem[]
}

export function Sidebar({ items }: SidebarProps) {
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const user = profile
    ? { name: profile.name, role: profile.role }
    : { name: 'User', role: 'creator' as const }

  const avatar = avatarColor(user.name)

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-bg-2">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-r bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
          IF
        </div>
        <span className="text-base font-semibold text-text">InvoFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-3">
          Menu
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const active = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-r px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-accent/15 text-accent-2 font-medium'
                      : 'text-text-2 hover:bg-bg-3 hover:text-text'
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/20 px-1.5 text-[11px] font-medium text-accent-2">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
              avatar.bg,
              avatar.text
            )}
          >
            {initials(user.name)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="truncate text-[11px] capitalize text-text-3">{user.role}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-r p-1.5 text-text-3 transition-colors hover:bg-bg-3 hover:text-red"
            title="Sign out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
