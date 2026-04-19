import { useParams, useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { InvoiceList } from '../../components/creator/InvoiceList'
import { NewInvoiceForm } from '../../components/creator/NewInvoiceForm'
import { InvoiceDetail } from '../../components/creator/InvoiceDetail'
import Settings from './Settings'

const sidebarItems = [
  { label: 'My Invoices', icon: '📄', path: '/dashboard/creator' },
  { label: 'New Invoice', icon: '➕', path: '/dashboard/creator/new' },
  { label: 'Settings', icon: '⚙️', path: '/dashboard/creator/settings' },
]

export default function CreatorDashboard() {
  const { id } = useParams()
  const location = useLocation()

  function renderPage() {
    if (location.pathname === '/dashboard/creator/settings') {
      return <Settings />
    }
    if (location.pathname === '/dashboard/creator/new') {
      return <NewInvoiceForm />
    }
    if (id) {
      return <InvoiceDetail invoiceId={id} simplifiedCreatorPayout />
    }
    return <InvoiceList />
  }

  return (
    <AppLayout sidebarItems={sidebarItems}>
      <div className="animate-fade-up">{renderPage()}</div>
    </AppLayout>
  )
}
