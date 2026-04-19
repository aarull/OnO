import type { Invoice, PaymentHistoryEntry } from '../../lib/types'
import {
  adjustedNetFromInvoice,
  commissionAmountFromInvoice,
  commissionRateFromInvoice,
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

  const commissionRate = commissionRateFromInvoice(invoice)
  const commissionAmountNum = commissionAmountFromInvoice(invoice, baseSafe, commissionRate)
  const showCommissionRow = commissionRate > 0

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

  return (
    <div className="rounded-r-2 border border-border bg-bg-2 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-3">
        Financial Breakdown
      </p>

      {/* Contract / invoice (adjusted net) */}
      <div className="rounded-r border border-border/70 bg-bg-3/25 p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-3">
          Total invoice
        </p>
        <dl className="space-y-3">
          <div className="flex justify-between gap-3">
            <dt className="text-sm text-text-2">Base Amount</dt>
            <dd className="text-sm font-medium tabular-nums text-text">{fmtAmount(baseSafe)}</dd>
          </div>
          {gstAmount > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-text-2">GST (18%)</dt>
              <dd className="text-sm font-medium tabular-nums text-text-2">+{fmtAmount(gstAmount)}</dd>
            </div>
          )}
          {showCommissionRow && (
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-text-3">
                Agency Commission ({commissionRate}%)
              </dt>
              <dd className="text-sm font-medium tabular-nums text-red">−{fmtAmount(commissionAmountNum)}</dd>
            </div>
          )}
          <div className="my-3 border-t border-dashed border-border/80" />
          <div className="flex justify-between gap-3">
            <dt className="text-sm font-bold uppercase tracking-wide text-text">
              Net payable base
            </dt>
            <dd className="text-base font-bold tabular-nums text-text">{fmtAmount(netPayableBase)}</dd>
          </div>
        </dl>
      </div>

      {/* Final payout / settlement */}
      <div className="mt-4 rounded-r border border-accent/25 bg-gradient-to-b from-accent/[0.07] to-transparent p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-accent-2">
          Final payout
        </p>
        <dl className="space-y-3">
          {showTdsRow && (
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-text-2">TDS (if applied)</dt>
              <dd className="text-sm font-medium tabular-nums text-red">−{fmtAmount(tdsAmountNum)}</dd>
            </div>
          )}
          {hasPartialPayments && (
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-text-2">Amount released</dt>
              <dd className="text-sm font-medium tabular-nums text-red">−{fmtAmount(amountPaidNum)}</dd>
            </div>
          )}
          <div className="my-3 border-t border-border/80" />
          <div className="flex justify-between gap-3">
            <dt className="text-sm font-bold uppercase tracking-wide text-accent-2">
              Final pending balance
            </dt>
            <dd className="font-serif text-2xl font-semibold tabular-nums leading-none text-accent-2">
              {fmtAmount(finalPendingBalance)}
            </dd>
          </div>
        </dl>
      </div>

      {hasPartialPayments && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="h-1.5 w-full rounded-full bg-gray-800">
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

      {simplifiedCreatorPayout && (
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-text-3">
          Final amount may be subject to TDS deductions by accounts after review.
        </p>
      )}
    </div>
  )
}
