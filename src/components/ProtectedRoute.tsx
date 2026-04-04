import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../lib/types'

const ROLE_DASHBOARDS: Record<Role, string> = {
  creator: '/dashboard/creator',
  im: '/dashboard/im',
  accounts: '/dashboard/accounts',
}

export default function ProtectedRoute({ role }: { role: Role }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/" replace />
  }

  if (profile.role !== role) {
    return <Navigate to={ROLE_DASHBOARDS[profile.role]} replace />
  }

  return <Outlet />
}
