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
  onRejectToCreator,
  onFixResubmitAccounts,
}: InvoiceCardProps) {
  const avatar = avatarColor(invoice.creator_name)
  const isPayerRejectedIm = invoiceHasStatus(invoice, 'payer_rejected_im')
  const payerRemark = invoice.rejection_note?.trim() ?? ''

  return (
    <div
      className={cn(
        'animate-fade-up rounded-r-2 border border-border bg-bg-2 p-5 transition-colors',
        isPayerRejectedIm
          ? cn(
              'border-b border-border border-l-2 border-l-amber/55 bg-gradient-to-r from-amber/[0.08] from-0% to-transparent to-50%',
              'hover:from-amber/[0.11]'
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

      {/* Amount */}
      <p className="mb-4 text-lg font-semibold text-text">
        {fmtAmount(invoice.amount)}
        {invoice.gst && (
          <span className="ml-2 text-xs font-normal text-text-3">+18% GST</span>
        )}
      </p>

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
              {payerRemark.length > 0 ? payerRemark : '—'}
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
      {isPayerRejectedIm ? (
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
    </div>
  )
}
