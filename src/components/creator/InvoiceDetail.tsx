import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Invoice, AuditEntry } from '../../lib/types'
import { fmtAmount, fmtDate } from '../../lib/utils'
import { StatusBadge } from '../shared/StatusBadge'
import { StatusTracker } from '../shared/StatusTracker'
import { ReminderToggle } from './ReminderToggle'

interface InvoiceDetailProps {
  invoiceId: string
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [inv, entries] = await Promise.all([
          api.get(`/invoices/${invoiceId}`),
          api.get(`/audit?invoice_id=${invoiceId}`).catch(() => []),
        ])
        setInvoice(inv)
        setAudit(Array.isArray(entries) ? entries : [])
      } catch {
        setInvoice(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [invoiceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="text-4xl">404</span>
        <p className="mt-3 text-sm text-text-3">Invoice not found</p>
        <button
          onClick={() => navigate('/dashboard/creator')}
          className="mt-4 text-sm text-accent-2 hover:underline"
        >
          Back to invoices
        </button>
      </div>
    )
  }

  const gstAmount = invoice.gst ? invoice.amount * 0.18 : 0
  const totalPayable = invoice.amount + gstAmount
  const maskedAccount =
    invoice.account_no.length > 4
      ? '•••• ' + invoice.account_no.slice(-4)
      : invoice.account_no

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/creator')}
        className="mb-6 flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-text"
      >
        <span>←</span> Back
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl text-text">{invoice.id}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-text-2">
            {invoice.creator_name} &middot; {fmtDate(invoice.created_at)}
          </p>
        </div>
        <ReminderToggle invoiceId={invoiceId} />
      </div>

      {/* Status Tracker */}
      <div className="mb-6 rounded-r-2 border border-border bg-bg-2 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
          Status
        </p>
        <StatusTracker status={invoice.status} />
      </div>

      {/* Rejection note */}
      {invoice.status === 'rejected' && invoice.rejection_note && (
        <div className="mb-6 rounded-r-2 border border-red/30 bg-red-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red">
            Rejection Reason
          </p>
          <p className="mt-2 text-sm text-text">{invoice.rejection_note}</p>
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Invoice details */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Invoice Details
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Base Amount</dt>
              <dd className="text-sm font-medium text-text">
                {fmtAmount(invoice.amount)}
              </dd>
            </div>
            {invoice.gst && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">GST (18%)</dt>
                <dd className="text-sm font-medium text-text">
                  {fmtAmount(gstAmount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="text-sm font-medium text-text">Total Payable</dt>
              <dd className="text-sm font-semibold text-accent-2">
                {fmtAmount(totalPayable)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Assigned IM</dt>
              <dd className="text-sm font-medium text-text">
                {invoice.assigned_im}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Submitted</dt>
              <dd className="text-sm text-text">
                {fmtDate(invoice.created_at)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bank details */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Bank Details
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Account No</dt>
              <dd className="text-sm font-medium text-text font-mono">
                {maskedAccount}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">IFSC</dt>
              <dd className="text-sm font-medium text-text font-mono">
                {invoice.ifsc}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Audit log */}
      {audit.length > 0 && (
        <div className="mt-6 rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Activity Log
          </p>
          <ul className="space-y-3">
            {audit.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent/50" />
                <div>
                  <p className="text-sm text-text">
                    <span className="font-medium">{entry.done_by}</span>{' '}
                    {entry.action}
                  </p>
                  {entry.note && (
                    <p className="mt-0.5 text-xs text-text-3">{entry.note}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-text-3">
                    {fmtDate(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
