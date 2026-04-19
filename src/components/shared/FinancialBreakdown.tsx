import type { Invoice, PaymentHistoryEntry } from '../../lib/types'
import {
  adjustedNetFromInvoice,
  commissionAmountStored,
  commissionRateFromInvoice,
  shouldShowCommissionRow,
} from '../../lib/invoicePayout'
import { fmtAmount, roundMoney } from '../../lib/utils'

export interface FinancialBreakdownProps {
  invoice: Invoice
  /** Creator-facing: hide TDS row; settlement uses pre-TDS net only */
  simplifiedCreatorPayout?: boolean
}

export function FinancialBreakdown({
  invoice,
  simplifiedCreatorPayout = false,
}: FinancialBreakdownProps) {
  const baseAmount = Number(invoice.amount)
  const baseSafe = Number.isFinite(baseAmount) ? baseAmount : 0
  const gstAmount = invoice.gst ? roundMoney(baseSafe * 0.18) : 0

  const tdsRaw = Number(invoice.tds_amount)
  const tdsAmountNum =
    !simplifiedCreatorPayout &&
    invoice.tds_amount != null &&
    Number.isFinite(tdsRaw) &&
    tdsRaw > 0
      ? roundMoney(Math.abs(tdsRaw))
      : 0
  const showTdsRow = !simplifiedCreatorPayout && tdsAmountNum > 0

  const commissionAmountNum = commissionAmountStored(invoice)
  const commissionRatePct = commissionRateFromInvoice(invoice)
  const showCommissionRow = shouldShowCommissionRow(invoice)

  const netPayableBase = adjustedNetFromInvoice(invoice)

  const afterTds = simplifiedCreatorPayout
    ? netPayableBase
    : roundMoney(netPayableBase - tdsAmountNum)

  const amountPaidNum = Number.isFinite(Number(invoice.amount_paid))
    ? Math.max(0, Number(invoice.amount_paid ?? 0))
    : 0

  const contractForProgress = afterTds > 0 ? afterTds : netPayableBase
  const hasPartialPayments =
    amountPaidNum > 0 && Number.isFinite(contractForProgress) && contractForProgress > 0

  const paidPercent = hasPartialPayments
    ? Math.min(
        100,
        Math.max(0, Math.round((amountPaidNum / contractForProgress) * 100))
      )
    : 0

  const finalPendingBalance = Math.max(0, roundMoney(afterTds - amountPaidNum))
  const pendingBalanceNum = finalPendingBalance

  const paymentHistory: PaymentHistoryEntry[] = Array.isArray(invoice.payment_history)
    ? invoice.payment_history
    : []
  const paymentHistorySorted = [...paymentHistory].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const mostRecentPayerNote =
    paymentHistorySorted.find((h) => (h.note ?? '').trim().length > 0)?.note?.trim() ?? ''

  /** Row shell: no-overlap layout — label left (max 60%, can wrap), amount right (nowrap). */
  const rowClass =
    'flex w-full items-start justify-between gap-4'
  const labelClass = 'max-w-[60%] min-w-0 text-sm font-medium leading-snug'
  const amountClass =
    'shrink-0 whitespace-nowrap text-right text-lg font-medium tabular-nums tracking-normal'

  return (
    <div className="rounded-r-2 border border-white/10 bg-bg-2 px-8 py-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-text-3">
        Financial Breakdown
      </p>

      {/* Contract / invoice (adjusted net) */}
      <div className="rounded-r border border-white/10 bg-bg-3/25 px-7 py-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-text-3">
          Total invoice
        </p>
        <dl>
          <div className={rowClass}>
            <dt className={`${labelClass} text-text-2`}>Base Amount</dt>
            <dd className={`${amountClass} text-text`}>{fmtAmount(baseSafe)}</dd>
          </div>
          {gstAmount > 0 && (
            <div className={`${rowClass} mt-3`}>
              <dt className={`${labelClass} text-text-2`}>GST (18%)</dt>
              <dd className={`${amountClass} text-text-2`}>+{fmtAmount(gstAmount)}</dd>
            </div>
          )}
          {showCommissionRow && (
            <div className={`${rowClass} mt-3`}>
              <dt className={`${labelClass} text-text-3`}>
                Agency Commission ({commissionRatePct}%)
              </dt>
              <dd className={`${amountClass} text-red`}>-{fmtAmount(commissionAmountNum)}</dd>
            </div>
          )}
          <div className="my-3 border-t border-dashed border-border/80" />
          <div className={rowClass}>
            <dt className={`${labelClass} uppercase tracking-wide text-text`}>Net payable base</dt>
            <dd className={`shrink-0 whitespace-nowrap text-right text-xl font-medium tabular-nums text-text`}>
              {fmtAmount(netPayableBase)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Final payout / settlement */}
      <div className="mt-4 rounded-r border border-white/10 bg-gradient-to-b from-accent/[0.07] to-transparent px-7 py-6">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-widest text-accent-2/80">
          Final payout
        </p>
        <dl>
          {showTdsRow && (
            <div className={rowClass}>
              <dt className={`${labelClass} text-text-2`}>TDS (if applied)</dt>
              <dd className={`${amountClass} text-red`}>-{fmtAmount(tdsAmountNum)}</dd>
            </div>
          )}
          {hasPartialPayments && (
            <div className={`${rowClass} ${showTdsRow ? 'mt-3' : ''}`}>
              <dt className={`${labelClass} text-text-2`}>Amount released</dt>
              <dd className={`${amountClass} text-red`}>-{fmtAmount(amountPaidNum)}</dd>
            </div>
          )}
          <div className="my-3 border-t border-border/80" />
          <div className={rowClass}>
            <dt
              className={`${labelClass} uppercase tracking-wide text-accent-2/85`}
            >
              Final pending balance
            </dt>
            <dd className="shrink-0 whitespace-nowrap text-right font-serif text-xl font-medium tabular-nums leading-snug tracking-[-0.02em] text-[#aaa3eb]">
              {fmtAmount(finalPendingBalance)}
            </dd>
          </div>
        </dl>
      </div>

      {hasPartialPayments && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="h-1.5 w-full rounded-full bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-indigo-500/80"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <p className="text-center text-xs text-text-3">
              <span className="whitespace-nowrap">
                {fmtAmount(amountPaidNum)} Paid • {fmtAmount(pendingBalanceNum)} Pending (
                {paidPercent}%)
              </span>
            </p>
          </div>
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

      {simplifiedCreatorPayout && (
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-text-3">
          Final amount may be subject to TDS deductions by accounts after review.
        </p>
      )}
    </div>
  )
}
