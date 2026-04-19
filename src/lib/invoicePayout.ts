import type { Invoice } from './types'
import { roundMoney } from './utils'

/** Persisted commission rupees from API only — never derived from base × rate. */
export function commissionAmountStored(inv: Invoice): number {
  if (inv.commission_amount == null) return 0
  const a = Number(inv.commission_amount)
  if (!Number.isFinite(a) || a === 0) return 0
  return roundMoney(Math.abs(a))
}

/** Show deduction row when persisted `commission_rate` from API is &gt; 0. */
export function shouldShowCommissionRow(inv: Invoice): boolean {
  const cr = Number(inv.commission_rate)
  return inv.commission_rate != null && Number.isFinite(cr) && cr > 0
}

/** Display % for the commission row — uses `invoice.commission_rate` only. */
export function commissionRateFromInvoice(inv: Invoice): number {
  const cr = Number(inv.commission_rate)
  if (inv.commission_rate != null && Number.isFinite(cr) && cr > 0) return Math.round(cr)
  return 0
}

/** Adjusted net = Base + GST − persisted `commission_amount` (0 if unset). */
export function adjustedNetFromInvoice(inv: Invoice): number {
  const base = Number(inv.amount)
  const baseSafe = Number.isFinite(base) ? base : 0
  const gstAmount = inv.gst ? roundMoney(baseSafe * 0.18) : 0
  const gross = roundMoney(baseSafe + gstAmount)
  return roundMoney(gross - commissionAmountStored(inv))
}

export function amountColumnSubtext(inv: Invoice): string {
  const base = Number(inv.amount)
  const baseSafe = Number.isFinite(base) ? base : 0
  const fmt = (n: number) =>
    n.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const cr = Number(inv.commission_rate)
  if (inv.commission_rate != null && Number.isFinite(cr) && cr > 0) {
    return `${fmt(baseSafe)} original • ${Math.round(cr)}% agency fee deducted`
  }
  return `${fmt(baseSafe)} original`
}
