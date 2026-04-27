import type { Invoice } from './types'
import { roundMoney } from './utils'

/** Net payable (no agency commission) = Base + GST. */
export function adjustedNetFromInvoice(inv: Invoice): number {
  const base = Number(inv.amount)
  const baseSafe = Number.isFinite(base) ? base : 0
  const gstAmount = inv.gst ? roundMoney(baseSafe * 0.18) : 0
  return roundMoney(baseSafe + gstAmount)
}
