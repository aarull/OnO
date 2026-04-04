import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo, initials, avatarColor, cn } from '../../lib/utils'
import { Button } from '../shared/Button'

interface InvoiceCardProps {
  invoice: Invoice
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function InvoiceCard({ invoice, onApprove, onReject }: InvoiceCardProps) {
  const avatar = avatarColor(invoice.creator_name)

  return (
    <div className="animate-fade-up rounded-r-2 border border-border bg-bg-2 p-5">
      {/* Header: Invoice ID + time */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-accent-2">{invoice.id}</span>
        <span className="text-xs text-text-3">{timeAgo(invoice.created_at)}</span>
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
      <p className="mb-5 text-lg font-semibold text-text">
        {fmtAmount(invoice.amount)}
        {invoice.gst && (
          <span className="ml-2 text-xs font-normal text-text-3">+18% GST</span>
        )}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="green"
          size="xs"
          className="flex-1"
          onClick={() => onApprove(invoice.id)}
        >
          Approve ✓
        </Button>
        <Button
          variant="red"
          size="xs"
          className="flex-1"
          onClick={() => onReject(invoice.id)}
        >
          Reject ✗
        </Button>
      </div>
    </div>
  )
}
