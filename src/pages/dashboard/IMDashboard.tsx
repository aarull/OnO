import { useLocation, useParams, matchPath } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { InvoiceDetail } from '../../components/creator/InvoiceDetail'
import { InvoiceQueue } from '../../components/im/InvoiceQueue'
import { ApprovedList } from '../../components/im/ApprovedList'
import Settings from './Settings'

const sidebarItems = [
  { label: 'My Queue', icon: '📥', path: '/dashboard/im' },
  { label: 'Approved', icon: '✅', path: '/dashboard/im/approved' },
  { label: 'Settings', icon: '⚙️', path: '/dashboard/im/settings' },
]

export default function IMDashboard() {
  const location = useLocation()
  const { id } = useParams()

  const detailMatch = matchPath(
    { path: '/dashboard/im/invoice/:id', end: true },
    location.pathname
  )

  if (location.pathname === '/dashboard/im/settings') {
    return (
      <AppLayout sidebarItems={sidebarItems}>
        <Settings />
      </AppLayout>
    )
  }

  if (detailMatch && id) {
    const fromApproved = Boolean(
      (location.state as { fromApproved?: boolean } | null)?.fromApproved
    )
    return (
      <AppLayout sidebarItems={sidebarItems}>
        <div className="animate-fade-up">
          <InvoiceDetail
            invoiceId={id}
            backPath={fromApproved ? '/dashboard/im/approved' : '/dashboard/im'}
            backLabel={fromApproved ? 'Back to approved' : 'Back to queue'}
            showReminderToggle={false}
          />
        </div>
      </AppLayout>
    )
  }

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
