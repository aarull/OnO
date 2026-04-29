import type { Invoice } from './types'
import { normalizeInvoiceStatus } from './invoiceStatus'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Canonical timestamp for aging: prefer explicit `cleared_at` once AP clears for payment.
 * Legacy rows cleared before this column existed fall back to `updated_at` only when status
 * is already audit-cleared or partially paid (surrogate clearance time — not creation).
 */
export function clearanceTimestampForAging(inv: Invoice): string | null {
  const cleared = typeof inv.cleared_at === 'string' ? inv.cleared_at.trim() : ''
  if (cleared.length > 0) return cleared

  const s = normalizeInvoiceStatus(inv.status)
  // Cleared-but-not-paid-yet rows: surrogate until migration backfills cleared_at everywhere
  if (s === 'audit_cleared' || s === 'partially_paid')
    return inv.updated_at ?? null

  return null
}

export function clearanceAgeWholeDays(inv: Invoice): number | null {
  const ts = clearanceTimestampForAging(inv)
  if (!ts) return null
  const clearedMs = new Date(ts).getTime()
  if (!Number.isFinite(clearedMs)) return null
  const ms = Date.now() - clearedMs
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.floor(ms / DAY_MS)
}

/** true = red tier (≥7d since clearance), false = amber tier (<7d), null = unknown / no clearance */
export function agingSeverity(inv: Invoice): 'amber' | 'red' | null {
  const days = clearanceAgeWholeDays(inv)
  if (days === null) return null
  return days >= 7 ? 'red' : 'amber'
}
