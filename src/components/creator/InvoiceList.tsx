import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { handleInvoiceDownload, handleInvoiceView } from '../../lib/invoiceDocumentActions'
import { handleWhatsAppReminder } from '../../lib/imWhatsAppReminder'
import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo } from '../../lib/utils'
import { PageHeader } from '../layout/PageHeader'
import { MetricsGrid } from '../shared/MetricsGrid'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceTable } from '../shared/InvoiceTable'
import { StatusBadge } from '../shared/StatusBadge'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'

export function InvoiceList() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

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
      render: (invoice: Invoice) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="text-accent transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation()
              void handleInvoiceView(invoice, setSelectedInvoice)
            }}
          >
            View
          </button>
          <span className="text-border">·</span>
          <button
            type="button"
            className="text-accent transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation()
              void handleInvoiceDownload(invoice)
            }}
          >
            Download
          </button>

          {(invoice.status === 'im_review' || invoice.status === 'im_approved') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleWhatsAppReminder(invoice)
              }}
              title="Send Reminder to IM Team"
              className="ml-2 flex items-center gap-1.5 rounded border border-[#25D366] px-2.5 py-1 text-xs font-medium text-[#25D366] shadow-[0_0_5px_rgba(37,211,102,0.2)] transition-all hover:bg-[#25D366]/10 hover:shadow-[0_0_10px_rgba(37,211,102,0.4)]"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Remind
            </button>
          )}
        </div>
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
      <InvoiceDetailPanel
        invoiceId={selectedInvoice?.id ?? null}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        backLabel="Back to invoices"
        showReminderToggle
      />

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
          onRowClick={(row) => setSelectedInvoice(row)}
        />
      </div>
    </>
  )
}
