import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { handleInvoiceDownload, handleInvoiceView } from '../../lib/invoiceDocumentActions'
import { handleWhatsAppReminder } from '../../lib/imWhatsAppReminder'
import { normalizeInvoiceStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import { cn, fmtAmount, timeAgo } from '../../lib/utils'
import { PageHeader } from '../layout/PageHeader'
import { MetricsGrid } from '../shared/MetricsGrid'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceTable } from '../shared/InvoiceTable'
import { StatusBadge } from '../shared/StatusBadge'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'
import {
  CreatorFixInvoiceModal,
  type CreatorFixInvoicePayload,
} from './CreatorFixInvoiceModal'

async function persistInvoiceUpdate(
  invoiceId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const client = supabase
  if (client) {
    const { error } = await client.from('invoices').update(fields).eq('id', invoiceId)
    if (error) throw new Error(error.message)
    return
  }
  await api.patch('/invoices/' + invoiceId + '/status', fields)
}

function rejectedRowClass(row: Invoice): string | undefined {
  if (normalizeInvoiceStatus(row.status) !== 'rejected') return undefined
  return cn(
    'border-l-2 border-l-amber/55 bg-gradient-to-r from-amber/[0.08] from-0% to-transparent to-50%',
    'hover:from-amber/[0.11]'
  )
}

function rejectedSubRow(row: Invoice, columnCount: number) {
  if (normalizeInvoiceStatus(row.status) !== 'rejected') return null
  const remark = row.rejection_note?.trim() ?? ''
  return (
    <tr
      className={cn(
        'border-b border-border border-l-2 border-l-amber/55 bg-red/[0.05]',
        'transition-colors hover:bg-red/[0.07]'
      )}
    >
      <td colSpan={columnCount} className="px-4 py-3 pl-5">
        <p className="text-sm leading-relaxed text-text">
          <span className="font-semibold text-amber">IM remark: </span>
          <span className="text-text">{remark.length > 0 ? remark : '—'}</span>
        </p>
      </td>
    </tr>
  )
}

export function InvoiceList() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [fixInvoice, setFixInvoice] = useState<Invoice | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      const data: Invoice[] = await api.get('/invoices')
      setInvoices(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchInvoices()
  }, [fetchInvoices])

  const totalSubmitted = invoices.length
  const pendingReview = invoices.filter((i) => {
    const s = normalizeInvoiceStatus(i.status)
    return s === 'submitted' || s === 'im_review' || s === 'rejected'
  }).length
  const released = invoices.filter((i) => i.status === 'released').length
  const totalPaid = invoices
    .filter((i) => i.status === 'released')
    .reduce((sum, i) => sum + i.amount * (i.gst ? 1.18 : 1), 0)

  async function handleSaveFix(id: string, payload: CreatorFixInvoicePayload) {
    await persistInvoiceUpdate(id, { ...payload } as Record<string, unknown>)
    toast.success('Invoice updated and resubmitted for review')
    await fetchInvoices()
  }

  const columns = [
    { key: 'id', label: 'Invoice ID' },
    { key: 'campaign', label: 'Campaign' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row: Invoice) => (
        <span>
          {fmtAmount(Number(row.amount))}
        </span>
      ),
    },
    { key: 'assigned_im', label: 'Assigned To' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Invoice) => (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={row.status} />
          {normalizeInvoiceStatus(row.status) === 'rejected' && (
            <span className="inline-flex items-center rounded-full border border-amber/35 bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
              IM return
            </span>
          )}
        </div>
      ),
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
          className="flex flex-wrap items-center gap-2"
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

          {normalizeInvoiceStatus(invoice.status) === 'rejected' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFixInvoice(invoice)
              }}
              className="ml-1 inline-flex items-center rounded-r bg-gradient-to-r from-accent to-accent-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] transition-all hover:opacity-95 hover:shadow-[0_0_18px_rgba(99,102,241,0.45)]"
            >
              Fix & resubmit
            </button>
          )}

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

      <CreatorFixInvoiceModal
        open={!!fixInvoice}
        invoice={fixInvoice}
        onClose={() => setFixInvoice(null)}
        onSave={handleSaveFix}
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
          getRowClassName={rejectedRowClass}
          renderSubRow={rejectedSubRow}
        />
      </div>
    </>
  )
}
