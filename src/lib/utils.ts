import { AVATAR_COLORS } from './constants'

let invoiceCounter = 1

export function genId(): string {
  const year = new Date().getFullYear()
  const num = String(invoiceCounter++).padStart(4, '0')
  return `INV-${year}-${num}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function fmtAmount(n: number): string {
  if (n >= 100000) {
    const lakhs = n / 100000
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }
  if (n >= 1000) {
    const thousands = n / 1000
    return `₹${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`
  }
  return `₹${n.toLocaleString('en-IN')}`
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  const mon = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${mon} ${year} · ${hours}:${mins}`
}

export function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function avatarColor(name: string): { bg: string; text: string } {
  const code = name.charCodeAt(0)
  return AVATAR_COLORS[code % 5]
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
