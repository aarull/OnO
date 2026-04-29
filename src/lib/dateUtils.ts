/**
 * Centralized IST (Asia/Kolkata) date/time helpers.
 *
 * JS `Date` always stores an absolute UTC timestamp; the bug typically comes from
 * formatting or deriving calendar dates using the server's local timezone (UTC in prod).
 *
 * These helpers ensure all "calendar" logic (DD/MM/YY, month-year, invoice dates, etc.)
 * is computed in IST regardless of runtime environment.
 */

export const IST_TIME_ZONE = 'Asia/Kolkata' as const

type DateInput = Date | string | number

function toDate(input?: DateInput): Date {
  if (input == null) return new Date()
  const d = input instanceof Date ? input : new Date(input)
  return d
}

/** Returns IST calendar parts for a given instant. */
export function getIstParts(input?: DateInput): {
  year: number
  month: number // 1-12
  day: number // 1-31
  hour: number // 0-23
  minute: number // 0-59
  second: number // 0-59
} {
  const d = toDate(input)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function getIstDate(input?: DateInput): string {
  const p = getIstParts(input)
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`
}

/** `YYYY-MM-DD` in IST (useful for invoice_date columns, sheets, grouping keys). */
export function getIstDateKey(input?: DateInput): string {
  const p = getIstParts(input)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** `DD/MM/YY` in IST (common for PDF header/footer). */
export function formatIstToDDMMYY(input?: DateInput): string {
  const p = getIstParts(input)
  const yy = String(p.year).slice(-2)
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${yy}`
}

/** `Mon YYYY` in IST (e.g. "Apr 2026"). */
export function formatIstToMonthYear(input?: DateInput): string {
  const d = toDate(input)
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    month: 'short',
    year: 'numeric',
  })
  return fmt.format(d)
}

/** `DD MMM YYYY, HH:mm` in IST. */
export function formatIstDateTime(input?: DateInput): string {
  const d = toDate(input)
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return fmt.format(d)
}

/**
 * ISO-like timestamp **in IST** with explicit offset.
 * Example: `2026-04-30T02:14:05+05:30`
 *
 * Use this when you need a stable human-readable timestamp that should reflect IST,
 * not UTC. Avoid using this as a DB "created_at" if your backend expects true ISO UTC.
 */
export function getIstIsoLikeTimestamp(input?: DateInput): string {
  const p = getIstParts(input)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(
    p.hour
  ).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(
    2,
    '0'
  )}+05:30`
}

