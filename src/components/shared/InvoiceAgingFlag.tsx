import type { Invoice } from '../../lib/types'
import { clearanceAgeWholeDays } from '../../lib/invoiceAging'
import { cn } from '../../lib/utils'

interface InvoiceAgingFlagProps {
  invoice: Invoice
  className?: string
}

/**
 * Minimal aging chip: dot + compact day count vs clearance timestamp.
 */
export function InvoiceAgingFlag({ invoice, className }: InvoiceAgingFlagProps) {
  const days = clearanceAgeWholeDays(invoice)

  if (days === null) {
    return (
      <span className={cn('text-[11px] font-medium tracking-tight text-text-3', className)}>
        N/A
      </span>
    )
  }

  const risky = days >= 7

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums tracking-tight',
        risky
          ? 'border-red-800/60 bg-red-900/50 text-red-200'
          : 'border-yellow-800/60 bg-yellow-900/50 text-yellow-200',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          risky ? 'bg-red-300/80' : 'bg-yellow-300/80'
        )}
        aria-hidden
      />
      <span>{days}d</span>
    </span>
  )
}
