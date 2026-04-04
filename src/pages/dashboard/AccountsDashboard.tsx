import { useLocation, useParams, matchPath } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PaymentQueue } from '../../components/accounts/PaymentQueue'
import { AgencyView } from '../../components/accounts/AgencyView'
import { AuditLog } from '../../components/accounts/AuditLog'
import { InvoiceDetail } from '../../components/creator/InvoiceDetail'
import Settings from './Settings'

const sidebarItems = [
  { label: 'Payment Queue', icon: '💳', path: '/dashboard/accounts' },
  { label: 'Agency View', icon: '📊', path: '/dashboard/accounts/agency' },
  { label: 'Audit Log', icon: '🗂', path: '/dashboard/accounts/audit' },
  { label: 'Settings', icon: '⚙️', path: '/dashboard/accounts/settings' },
]

export default function AccountsDashboard() {
  const location = useLocation()
  const { id } = useParams()

  const invoiceDetailMatch = matchPath(
    { path: '/dashboard/accounts/invoice/:id', end: true },
    location.pathname
  )

  if (invoiceDetailMatch && id) {
    return (
      <AppLayout sidebarItems={sidebarItems}>
        <div className="animate-fade-up">
          <InvoiceDetail
            invoiceId={id}
            backPath="/dashboard/accounts"
            backLabel="Back to payment queue"
            showReminderToggle={false}
          />
        </div>
      </AppLayout>
    )
  }

  let page: React.ReactNode
  switch (location.pathname) {
    case '/dashboard/accounts/settings':
      page = <Settings />
      break
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
