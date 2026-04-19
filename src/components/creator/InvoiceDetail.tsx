import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Invoice, AuditEntry, PaymentHistoryEntry } from '../../lib/types'
import { fmtAmount, fmtDate, roundMoney } from '../../lib/utils'
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
   * Creator-facing estimate: hide TDS in the breakdown and use (Base + GST) − commission
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

  const baseAmount = Number(invoice.amount)
  const baseSafe = Number.isFinite(baseAmount) ? baseAmount : 0
  const gstAmount = invoice.gst ? roundMoney(baseSafe * 0.18) : 0
  const grossSubtotal = roundMoney(baseSafe + gstAmount)
  const tdsRaw = Number(invoice.tds_amount)
  const tdsAmountNum =
    !simplifiedCreatorPayout &&
    invoice.tds_amount != null &&
    Number.isFinite(tdsRaw) &&
    tdsRaw > 0
      ? roundMoney(Math.abs(tdsRaw))
      : 0
  const showTdsRow = !simplifiedCreatorPayout && tdsAmountNum > 0

  const commissionPctRaw = Number(invoice.commission_percentage)
  const commissionPctFromApi =
    Number.isFinite(commissionPctRaw) && commissionPctRaw > 0 ? Math.round(commissionPctRaw) : 0
  const commissionFromApi = Number(invoice.commission_amount)
  const commissionAmountNum =
    invoice.commission_amount != null &&
    Number.isFinite(commissionFromApi) &&
    Math.abs(commissionFromApi) > 0
      ? roundMoney(Math.abs(commissionFromApi))
      : commissionPctFromApi > 0
        ? roundMoney((baseSafe * commissionPctFromApi) / 100)
        : 0
  const displayCommissionPct =
    commissionPctFromApi > 0
      ? commissionPctFromApi
      : baseSafe > 0 && commissionAmountNum > 0
        ? Math.max(1, Math.round((commissionAmountNum / baseSafe) * 100))
        : 0
  const showCommissionRow = commissionAmountNum > 0

  /** Full view: (Base + GST) − TDS − commission. Creator estimate: (Base + GST) − commission */
  const derivedNetPayable = simplifiedCreatorPayout
    ? roundMoney(grossSubtotal - commissionAmountNum)
    : roundMoney(grossSubtotal - tdsAmountNum - commissionAmountNum)
  const apiFinalRaw = invoice.final_payable_amount
  const payableTotal = simplifiedCreatorPayout
    ? derivedNetPayable
    : commissionAmountNum > 0
      ? derivedNetPayable
      : apiFinalRaw != null && Number.isFinite(Number(apiFinalRaw))
        ? roundMoney(Number(apiFinalRaw))
        : derivedNetPayable
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
  const amountPaidNum = Number(invoice.amount_paid ?? 0)
  const hasPartialPayments =
    Number.isFinite(amountPaidNum) &&
    amountPaidNum > 0 &&
    Number.isFinite(payableTotal) &&
    payableTotal > 0
  const paidPercent = hasPartialPayments
    ? Math.min(100, Math.max(0, Math.round((amountPaidNum / payableTotal) * 100)))
    : 0
  const pendingBalanceNum = hasPartialPayments ? Math.max(0, roundMoney(payableTotal - amountPaidNum)) : 0
  const pendingBalanceDisplay = Number.isFinite(payableTotal)
    ? hasPartialPayments
      ? pendingBalanceNum
      : payableTotal
    : 0
  const mostRecentPayerNote =
    paymentHistorySorted.find((h) => (h.note ?? '').trim().length > 0)?.note?.trim() ?? ''

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
        {showReminderToggle &&
          (invoice.status === 'im_review' || invoice.status === 'im_approved') && (
            <button
              type="button"
              onClick={() => handleWhatsAppReminder(invoice)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#25D366] text-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.2)] hover:shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:bg-[#25D366]/10 transition-all text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
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
        {/* Financial breakdown */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Financial Breakdown
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Base Amount</dt>
              <dd className="text-sm font-medium text-text">{fmtAmount(baseSafe)}</dd>
            </div>
            {gstAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">GST (18%)</dt>
                <dd className="text-sm font-medium text-text-2">+{fmtAmount(gstAmount)}</dd>
              </div>
            )}
            {showCommissionRow && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-3">
                  Agency Commission ({displayCommissionPct}%)
                </dt>
                <dd className="text-sm font-medium text-red">−{fmtAmount(commissionAmountNum)}</dd>
              </div>
            )}
            {showTdsRow && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">TDS (1%)</dt>
                <dd className="text-sm font-medium text-red">−{fmtAmount(tdsAmountNum)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-4">
              <dt className="text-sm font-semibold uppercase tracking-wide text-text">
                Total Invoice Value
              </dt>
              <dd className="font-serif text-lg font-semibold leading-none text-accent-2">
                {fmtAmount(payableTotal)}
              </dd>
            </div>
            {hasPartialPayments && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">Amount Released</dt>
                <dd className="text-sm font-medium text-red">−{fmtAmount(amountPaidNum)}</dd>
              </div>
            )}

            <div className="flex justify-between border-t-2 border-border pt-4">
              <dt className="text-sm font-semibold uppercase tracking-wide text-text">
                Pending Balance
              </dt>
              <dd className="font-serif text-xl font-semibold leading-none text-accent-2">
                {fmtAmount(pendingBalanceDisplay)}
              </dd>
            </div>

            {hasPartialPayments && (
              <div className="pt-2">
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-text-3">
                  {fmtAmount(amountPaidNum)} Paid • {fmtAmount(pendingBalanceNum)} Pending ({paidPercent}
                  %)
                </p>
                {mostRecentPayerNote.length > 0 && (
                  <div className="mt-3 rounded-r border border-border bg-gray-800/50 p-2">
                    <div className="flex">
                      <div className="mr-2 w-0.5 shrink-0 rounded-full bg-indigo-500" />
                      <p className="text-sm text-gray-300">{mostRecentPayerNote}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </dl>
            {simplifiedCreatorPayout && (
              <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-text-3">
                Final amount may be subject to TDS deductions by accounts after review.
              </p>
            )}
        </div>

        {/* Creator & bank */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Creator &amp; Bank Details
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Account Holder</dt>
              <dd className="text-sm font-medium text-text">{accountHolderDisplay}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">Account Number</dt>
              <dd className="text-sm font-medium text-text font-mono">
                {invoice.account_no}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-2">IFSC Code</dt>
              <dd className="text-sm font-medium text-text font-mono">{invoice.ifsc}</dd>
            </div>
            {hasGstNumber && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">GST Number</dt>
                <dd className="text-sm font-medium text-text font-mono">{gstNumberResolved}</dd>
              </div>
            )}
            {hasPanNumber && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">PAN Number</dt>
                <dd className="text-sm font-medium text-text font-mono">{panNumberResolved}</dd>
              </div>
            )}
            {showTaxIdFallback && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-2">Tax ID</dt>
                <dd className="text-sm font-medium text-text-3">N/A</dd>
              </div>
            )}
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

      {/* Payment updates (Final Payer notes / partial releases) */}
      {paymentHistorySorted.length > 0 && (
        <div className="mt-6 rounded-r-2 border border-border bg-bg-2 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
            Payment Updates
          </p>
          <ul className="space-y-3">
            {paymentHistorySorted.map((h, idx) => {
              const note = (h.note ?? '').trim()
              const d = new Date(h.created_at)
              const createdAtDisplay = Number.isFinite(d.getTime())
                ? d.toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
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
