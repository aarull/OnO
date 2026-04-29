import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Invoice, AuditEntry, PaymentHistoryEntry } from '../../lib/types'
import { adjustedNetFromInvoice } from '../../lib/invoicePayout'
import { fmtAmount, fmtDate } from '../../lib/utils'
import { formatIstDateTime } from '../../lib/dateUtils'
import { FinancialBreakdown } from '../shared/FinancialBreakdown'
import { StatusBadge } from '../shared/StatusBadge'
import { StatusTracker } from '../shared/StatusTracker'
import { handleWhatsAppReminder } from '../../lib/imWhatsAppReminder'

interface InvoiceDetailProps {
  invoiceId: string
  /** Defaults to creator list */
  backPath?: string
  backLabel?: string
  showReminderToggle?: boolean
  /**
   * Creator-facing estimate: hide TDS in the breakdown and use (Base + GST)
   * for displayed totals. IM / accounts views should omit this (default false).
   */
  simplifiedCreatorPayout?: boolean
  /** When set (e.g. modal overlay), Back uses this instead of router navigation */
  onClose?: () => void
}

export function InvoiceDetail({
  invoiceId,
  backPath = '/dashboard/creator',
  backLabel = 'Back to invoices',
  showReminderToggle = true,
  simplifiedCreatorPayout = false,
  onClose,
}: InvoiceDetailProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onClose) onClose()
    else navigate(backPath)
  }
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
          onClick={handleBack}
          className="mt-4 text-sm text-accent-2 hover:underline"
        >
          {backLabel}
        </button>
      </div>
    )
  }

  const accountHolderDisplay =
    invoice.account_holder_name?.trim() ? invoice.account_holder_name.trim() : 'N/A'
  const gstNumberResolved =
    invoice.gst_number?.trim() || invoice.creator?.gst_number?.trim() || ''
  const panNumberResolved =
    invoice.pan_number?.trim() || invoice.creator?.pan_number?.trim() || ''
  const hasGstNumber = gstNumberResolved.length > 0
  const hasPanNumber = panNumberResolved.length > 0
  const showTaxIdFallback = !hasGstNumber && !hasPanNumber
  const paymentHistory: PaymentHistoryEntry[] = Array.isArray(invoice.payment_history)
    ? invoice.payment_history
    : []
  const paymentHistorySorted = [...paymentHistory].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <>
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-6 flex items-center gap-1 text-sm text-text-2 transition-colors hover:text-text"
      >
        <span>←</span> {backLabel}
      </button>

      {/* Header + hero adjusted net */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-xl text-text">{invoice.id}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="mt-1 text-sm text-text-2">
              {invoice.creator_name} &middot; {fmtDate(invoice.created_at)}
            </p>
          </div>
          {showReminderToggle &&
            (invoice.status === 'im_review' || invoice.status === 'im_approved') && (
              <button
                type="button"
                onClick={() => handleWhatsAppReminder(invoice)}
                className="flex shrink-0 items-center gap-2 self-start rounded-md border border-[#25D366] px-4 py-2 text-sm font-medium text-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.2)] transition-all hover:bg-[#25D366]/10 hover:shadow-[0_0_15px_rgba(37,211,102,0.4)]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  aria-hidden
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Send Reminder
              </button>
            )}
        </div>
        <div className="rounded-r-2 border border-white/10 bg-gradient-to-br from-bg-2 via-bg-2 to-bg-3/40 px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex w-full items-start justify-between gap-4">
            <div className="max-w-[60%] min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-3">
                Net payable amount
              </p>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-text-3">
                Base + GST (before TDS and releases).
              </p>
            </div>
            <p className="shrink-0 whitespace-nowrap text-right font-serif text-xl font-medium tabular-nums leading-snug tracking-[-0.02em] text-[#b6aff5]">
              {fmtAmount(adjustedNetFromInvoice(invoice))}
            </p>
          </div>
        </div>
      </div>

      {/* Status Tracker */}
      <div className="mb-6 rounded-r-2 border border-white/10 bg-bg-2 px-6 py-5">
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
        <FinancialBreakdown invoice={invoice} simplifiedCreatorPayout={simplifiedCreatorPayout} />

        {/* Creator & bank */}
        <div className="rounded-r-2 border border-white/10 bg-bg-2 px-6 py-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Creator &amp; Bank Details
          </p>
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="min-w-0 text-sm text-text-2">Account Holder</dt>
              <dd className="shrink-0 text-right text-sm font-medium text-text">{accountHolderDisplay}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="min-w-0 text-sm text-text-2">Account Number</dt>
              <dd className="shrink-0 text-right text-sm font-medium font-mono text-text">
                {invoice.account_no}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="min-w-0 text-sm text-text-2">IFSC Code</dt>
              <dd className="shrink-0 text-right text-sm font-medium font-mono text-text">{invoice.ifsc}</dd>
            </div>
            {hasGstNumber && (
              <div className="flex items-center justify-between gap-3">
                <dt className="min-w-0 text-sm text-text-2">GST Number</dt>
                <dd className="shrink-0 text-right text-sm font-medium font-mono text-text">{gstNumberResolved}</dd>
              </div>
            )}
            {hasPanNumber && (
              <div className="flex items-center justify-between gap-3">
                <dt className="min-w-0 text-sm text-text-2">PAN Number</dt>
                <dd className="shrink-0 text-right text-sm font-medium font-mono text-text">{panNumberResolved}</dd>
              </div>
            )}
            {showTaxIdFallback && (
              <div className="flex items-center justify-between gap-3">
                <dt className="min-w-0 text-sm text-text-2">Tax ID</dt>
                <dd className="shrink-0 text-right text-sm font-medium text-text-3">N/A</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Audit log */}
      {audit.length > 0 && (
        <div className="mt-6 rounded-r-2 border border-white/10 bg-bg-2 px-6 py-5">
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

      {/* Payment updates (Final Payer notes / partial releases) */}
      {paymentHistorySorted.length > 0 && (
        <div className="mt-6 rounded-r-2 border border-white/10 bg-bg-2 px-6 py-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Payment Updates
          </p>
          <ul className="space-y-3">
            {paymentHistorySorted.map((h, idx) => {
              const note = (h.note ?? '').trim()
              const createdAtDisplay = formatIstDateTime(h.created_at)
              return (
                <li key={`${h.created_at}-${idx}`} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent/50" />
                  <div className="w-full">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-text">
                        <span className="font-medium text-accent-2">{fmtAmount(Number(h.amount))}</span>{' '}
                        <span className="text-text-2">·</span>{' '}
                        <span className="text-sm text-text">{h.reason || 'Payment update'}</span>
                      </p>
                      <p className="text-[11px] text-text-3">{createdAtDisplay}</p>
                    </div>
                    <p className="mt-1 text-xs text-text-3">
                      <span className="font-medium text-text-2">Note: </span>
                      <span className="text-text-3">{note.length > 0 ? note : '—'}</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
