import type { InvoiceStatus } from '../../lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'
import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: InvoiceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status]
  const label = STATUS_LABELS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        colors.bg,
        colors.text
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  )
}
