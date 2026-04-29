import { adjustedNetFromInvoice } from '../../lib/invoicePayout'
import type { Invoice } from '../../lib/types'
import { invoiceHasStatus } from '../../lib/invoiceStatus'
import { fmtAmount, timeAgo, initials, avatarColor, cn } from '../../lib/utils'
import { Button } from '../shared/Button'
import { InvoicePdfActions } from '../shared/InvoicePdfActions'

interface InvoiceCardProps {
  invoice: Invoice
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onViewTimeline: (invoice: Invoice) => void
  approvingId?: string | null
  approveRemark?: string
  onApproveRemarkChange?: (next: string) => void
  onCancelApprove?: () => void
  onConfirmApprove?: (id: string) => void
  approveSubmitting?: boolean
  /** Payer-returned lane: send back to creator with a new remark */
  onRejectToCreator?: (id: string) => void
  /** Payer-returned lane: adjust base amount only and return to Accounts audit */
  onFixResubmitAccounts?: (invoice: Invoice) => void
}

export function InvoiceCard({
  invoice,
  onApprove,
  onReject,
  onViewTimeline,
  approvingId,
  approveRemark,
  onApproveRemarkChange,
  onCancelApprove,
  onConfirmApprove,
  approveSubmitting,
  onRejectToCreator,
  onFixResubmitAccounts,
}: InvoiceCardProps) {
  const avatar = avatarColor(invoice.creator_name)
  const isPayerRejectedIm = invoiceHasStatus(invoice, 'payer_rejected_im')
  const isAuditRejected = invoiceHasStatus(invoice, 'audit_rejected')
  const rejectionRemark = invoice.rejection_note?.trim() ?? ''

  const finalPayable = Number(invoice.final_payable_amount ?? 0)
  const amountPaid = Number(invoice.amount_paid ?? 0)
  const hasPaymentProgress =
    invoiceHasStatus(invoice, 'partially_paid') || (Number.isFinite(amountPaid) && amountPaid > 0)
  const progressPctRaw =
    Number.isFinite(finalPayable) && finalPayable > 0 ? (amountPaid / finalPayable) * 100 : 0
  const progressPct = Math.min(100, Math.max(0, Number.isFinite(progressPctRaw) ? progressPctRaw : 0))
  const pendingBalance =
    Number.isFinite(finalPayable) && finalPayable > 0 && Number.isFinite(amountPaid)
      ? Math.max(0, finalPayable - amountPaid)
      : 0

  return (
    <div
      className={cn(
        'relative overflow-hidden animate-fade-up rounded-r-2 border border-border bg-bg-2 p-5 transition-colors',
        isPayerRejectedIm
          ? cn(
              'border-b border-border border-l-2 border-l-amber/55 bg-gradient-to-r from-amber/[0.08] from-0% to-transparent to-50%',
              'hover:from-amber/[0.11]'
            )
          : isAuditRejected
            ? cn(
                'border-b border-border border-l-2 border-l-red/55 bg-gradient-to-r from-red/[0.1] from-0% to-transparent to-50%',
                'hover:from-red/[0.14]'
              )
            : 'hover:bg-bg-3/50'
      )}
    >
      {/* Header: Invoice ID + flag chip + time (mirrors AuditorQueue flag column) */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-accent-2">{invoice.id}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isPayerRejectedIm && (
            <span className="inline-flex items-center rounded-full border border-amber/35 bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
              Payer return
            </span>
          )}
          {isAuditRejected && (
            <span className="inline-flex items-center rounded-full border border-red/35 bg-red-bg px-2 py-0.5 text-[11px] font-medium text-red">
              Accounts rejected
            </span>
          )}
          <span className="text-xs text-text-3">{timeAgo(invoice.created_at)}</span>
        </div>
      </div>

      {/* Creator */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
            avatar.bg,
            avatar.text
          )}
        >
          {initials(invoice.creator_name)}
        </div>
        <span className="text-sm font-medium text-text">{invoice.creator_name}</span>
      </div>

      {/* Campaign */}
      <p className="mb-3 text-sm text-text-2">{invoice.campaign}</p>

      {/* Amount (adjusted net) */}
      <div className={cn(hasPaymentProgress ? 'mb-2' : 'mb-4')}>
        <p className="text-lg font-semibold text-accent-2">
          {fmtAmount(adjustedNetFromInvoice(invoice))}
        </p>
      </div>

      {hasPaymentProgress && (
        <div className="mb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-accent-2 transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-text-3">
            {fmtAmount(amountPaid)} Paid • {fmtAmount(pendingBalance)} Pending
          </p>
        </div>
      )}

      {/* Same block as AuditorQueue second <tr> (payer remark row) */}
      {isPayerRejectedIm && (
        <div
          className={cn(
            'mb-4 rounded-r border-b border-border border-l-2 border-l-amber/55 bg-red/[0.05]',
            'px-4 py-3 pl-5 hover:bg-red/[0.07] transition-colors'
          )}
        >
          <p className="text-sm leading-relaxed text-text">
            <span className="font-semibold text-amber">Payer remark: </span>
            <span className="text-text">
              {rejectionRemark.length > 0 ? rejectionRemark : '—'}
            </span>
          </p>
        </div>
      )}
      {isAuditRejected && (
        <div
          className={cn(
            'mb-4 rounded-r border border-red/25 border-l-2 border-l-red/60 bg-red-bg/50',
            'px-4 py-3 pl-5 transition-colors hover:bg-red-bg/70'
          )}
        >
          <p className="text-sm leading-relaxed text-text">
            <span className="font-semibold text-red">Accounts remark: </span>
            <span className="text-text">
              {rejectionRemark.length > 0 ? rejectionRemark : '—'}
            </span>
          </p>
        </div>
      )}

      <div className="mb-4 border-t border-border pt-3">
        <InvoicePdfActions
          invoice={invoice}
          onViewTimeline={onViewTimeline}
          className="gap-x-3"
          linkClassName="text-[11px] font-medium text-text-2 underline-offset-2 transition-colors hover:text-accent-2 hover:underline"
        />
      </div>

      {/* Actions */}
      {isAuditRejected ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="red"
            size="xs"
            className="flex-1 border border-red/40"
            onClick={() => onRejectToCreator?.(invoice.id)}
          >
            Send back to creator
          </Button>
          <Button
            variant="accent"
            size="xs"
            className="flex-1 border border-red/35"
            onClick={() => onFixResubmitAccounts?.(invoice)}
          >
            Fix &amp; Resubmit
          </Button>
        </div>
      ) : isPayerRejectedIm ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="red"
            size="xs"
            className="flex-1 border border-red/40"
            onClick={() => onRejectToCreator?.(invoice.id)}
          >
            Reject to creator
          </Button>
          <Button
            variant="accent"
            size="xs"
            className="flex-1 border border-amber/35"
            onClick={() => onFixResubmitAccounts?.(invoice)}
          >
            Fix base amount
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="green"
            size="xs"
            className="flex-1"
            onClick={() => onApprove(invoice.id)}
          >
            Approve ✓
          </Button>
          <Button variant="red" size="xs" className="flex-1" onClick={() => onReject(invoice.id)}>
            Reject ✗
          </Button>
        </div>
      )}

      {approvingId === invoice.id && (
        <div className="absolute inset-0 z-20 bg-[#1A1A1A] p-4 flex flex-col gap-3 rounded-xl">
          <div>
            <p className="font-serif text-lg text-text">Approve Invoice</p>
            <p className="mt-1 text-sm text-text-2">
              Approving {invoice.invoice_number ?? invoice.id} for {invoice.creator_name}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label className="block text-sm font-medium text-text">
              Add a custom note or remark for the Accounts team{' '}
              <span className="text-text-3">(Optional)</span>
            </label>
            <textarea
              value={approveRemark ?? ''}
              onChange={(e) => onApproveRemarkChange?.(e.target.value)}
              placeholder="e.g. All details verified, proceed with payout."
              className="w-full flex-grow resize-none rounded-r border border-gray-800 bg-[#141414] px-4 py-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancelApprove?.()}
              disabled={!!approveSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="green"
              size="sm"
              onClick={() => onConfirmApprove?.(invoice.id)}
              disabled={!!approveSubmitting}
            >
              {approveSubmitting ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
