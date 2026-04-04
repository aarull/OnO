import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import CreatorAuth from './pages/auth/CreatorAuth'
import IMAuth from './pages/auth/IMAuth'
import AccountsAuth from './pages/auth/AccountsAuth'
import CreatorDashboard from './pages/dashboard/CreatorDashboard'
import IMDashboard from './pages/dashboard/IMDashboard'
import AccountsDashboard from './pages/dashboard/AccountsDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16161f',
            color: '#f0f0f5',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/creator" element={<CreatorAuth />} />
        <Route path="/auth/im" element={<IMAuth />} />
        <Route path="/auth/accounts" element={<AccountsAuth />} />

        <Route element={<ProtectedRoute role="creator" />}>
          <Route path="/dashboard/creator" element={<CreatorDashboard />} />
          <Route path="/dashboard/creator/new" element={<CreatorDashboard />} />
          <Route path="/dashboard/creator/:id" element={<CreatorDashboard />} />
        </Route>

        <Route element={<ProtectedRoute role="im" />}>
          <Route path="/dashboard/im" element={<IMDashboard />} />
          <Route path="/dashboard/im/approved" element={<IMDashboard />} />
        </Route>

        <Route element={<ProtectedRoute role="accounts" />}>
          <Route path="/dashboard/accounts" element={<AccountsDashboard />} />
          <Route path="/dashboard/accounts/agency" element={<AccountsDashboard />} />
          <Route path="/dashboard/accounts/audit" element={<AccountsDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
