import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo } from '../../lib/utils'
import { PageHeader } from '../layout/PageHeader'
import { MetricsGrid } from '../shared/MetricsGrid'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceTable } from '../shared/InvoiceTable'
import { StatusBadge } from '../shared/StatusBadge'

export function InvoiceList() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/invoices')
      .then((data) => setInvoices(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalSubmitted = invoices.length
  const pendingReview = invoices.filter(
    (i) => i.status === 'submitted' || i.status === 'im_review'
  ).length
  const released = invoices.filter((i) => i.status === 'released').length
  const totalPaid = invoices
    .filter((i) => i.status === 'released')
    .reduce((sum, i) => sum + i.amount * (i.gst ? 1.18 : 1), 0)

  const columns = [
    { key: 'id', label: 'Invoice ID' },
    { key: 'campaign', label: 'Campaign' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row: Invoice) => (
        <span>
          {fmtAmount(row.amount)}
          {row.gst && (
            <span className="ml-1 text-[11px] text-text-3">+GST</span>
          )}
        </span>
      ),
    },
    { key: 'assigned_im', label: 'Assigned To' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Invoice) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      label: 'Time',
      render: (row: Invoice) => (
        <span className="text-text-3">{timeAgo(row.created_at)}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row: Invoice) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/dashboard/creator/${row.id}`)
          }}
          className="text-xs font-medium text-accent-2 transition-colors hover:text-accent"
        >
          View
        </button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="My Invoices"
        subtitle="Track all your submitted invoices and payment status"
        action={{
          label: '+ New Invoice',
          onClick: () => navigate('/dashboard/creator/new'),
        }}
      />

      <MetricsGrid columns={4}>
        <MetricCard icon="📤" value={totalSubmitted} label="Total Submitted" />
        <MetricCard icon="⏳" value={pendingReview} label="Pending Review" />
        <MetricCard icon="✅" value={released} label="Released" />
        <MetricCard icon="💰" value={fmtAmount(totalPaid)} label="Total Paid Out" />
      </MetricsGrid>

      <div className="mt-6">
        <InvoiceTable
          columns={columns}
          data={invoices}
          onRowClick={(row) => navigate(`/dashboard/creator/${row.id}`)}
        />
      </div>
    </>
  )
}
