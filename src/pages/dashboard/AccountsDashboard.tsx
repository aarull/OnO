import { useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PaymentQueue } from '../../components/accounts/PaymentQueue'
import { AgencyView } from '../../components/accounts/AgencyView'
import { AuditLog } from '../../components/accounts/AuditLog'

const sidebarItems = [
  { label: 'Payment Queue', icon: '💳', path: '/dashboard/accounts' },
  { label: 'Agency View', icon: '📊', path: '/dashboard/accounts/agency' },
  { label: 'Audit Log', icon: '🗂', path: '/dashboard/accounts/audit' },
]

export default function AccountsDashboard() {
  const location = useLocation()

  let page: React.ReactNode
  switch (location.pathname) {
    case '/dashboard/accounts/agency':
      page = <AgencyView />
      break
    case '/dashboard/accounts/audit':
      page = <AuditLog />
      break
    default:
      page = <PaymentQueue />
  }

  return <AppLayout sidebarItems={sidebarItems}>{page}</AppLayout>
}
