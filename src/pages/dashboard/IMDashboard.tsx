import { useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { InvoiceQueue } from '../../components/im/InvoiceQueue'
import { ApprovedList } from '../../components/im/ApprovedList'

const sidebarItems = [
  { label: 'My Queue', icon: '📥', path: '/dashboard/im' },
  { label: 'Approved', icon: '✅', path: '/dashboard/im/approved' },
]

export default function IMDashboard() {
  const location = useLocation()

  return (
    <AppLayout sidebarItems={sidebarItems}>
      {location.pathname === '/dashboard/im/approved' ? (
        <ApprovedList />
      ) : (
        <InvoiceQueue />
      )}
    </AppLayout>
  )
}
