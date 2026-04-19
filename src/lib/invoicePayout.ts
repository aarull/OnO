import type { Invoice } from './types'
import { roundMoney } from './utils'

/** Prefer API `commission_rate`, fall back to `commission_percentage`. */
export function commissionRateFromInvoice(inv: Invoice): number {
  const r = Number(inv.commission_rate ?? inv.commission_percentage ?? 0)
  return Number.isFinite(r) && r > 0 ? Math.round(r) : 0
}

export function commissionAmountFromInvoice(inv: Invoice, baseSafe: number, rate: number): number {
  const fromApi = Number(inv.commission_amount)
  if (inv.commission_amount != null && Number.isFinite(fromApi) && Math.abs(fromApi) > 0) {
    return roundMoney(Math.abs(fromApi))
  }
  if (rate > 0 && baseSafe > 0) return roundMoney((baseSafe * rate) / 100)
  return 0
}

/** Adjusted net = Base + GST − agency commission (before TDS). */
export function adjustedNetFromInvoice(inv: Invoice): number {
  const base = Number(inv.amount)
  const baseSafe = Number.isFinite(base) ? base : 0
  const gstAmount = inv.gst ? roundMoney(baseSafe * 0.18) : 0
  const gross = roundMoney(baseSafe + gstAmount)
  const rate = commissionRateFromInvoice(inv)
  const commission = commissionAmountFromInvoice(inv, baseSafe, rate)
  return roundMoney(gross - commission)
}

export function amountColumnSubtext(inv: Invoice): string {
  const base = Number(inv.amount)
  const baseSafe = Number.isFinite(base) ? base : 0
  const rate = commissionRateFromInvoice(inv)
  const fmt = (n: number) =>
    n.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  if (rate <= 0) {
    return `${fmt(baseSafe)} original`
  }
  return `${fmt(baseSafe)} original • ${rate}% agency fee deducted`
}
