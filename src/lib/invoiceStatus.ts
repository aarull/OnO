import type { InvoiceStatus } from './types'

/**
 * Normalizes status strings from APIs or DBs that may use PascalCase, spaces, or snake_case.
 * e.g. "IM Approved" → "im_approved"
 */
export function normalizeInvoiceStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function invoiceHasStatus(invoice: { status: InvoiceStatus }, target: InvoiceStatus): boolean {
  return normalizeInvoiceStatus(invoice.status) === target
}
