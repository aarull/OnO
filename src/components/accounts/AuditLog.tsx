import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import type { AuditEntry } from '../../lib/types'
import { fmtDate, cn } from '../../lib/utils'
import { EmptyState } from '../shared/EmptyState'

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  Submitted: { bg: 'bg-blue-bg', text: 'text-blue' },
  'Marked as IM Review': { bg: 'bg-amber-bg', text: 'text-amber' },
  'IM Approved': { bg: 'bg-green-bg', text: 'text-green' },
  Rejected: { bg: 'bg-red-bg', text: 'text-red' },
  'Payment Released': { bg: 'bg-green-bg', text: 'text-green' },
  'Reminder sent': { bg: 'bg-accent-bg', text: 'text-accent-2' },
}

export function AuditLog() {
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/audit')
        setAudit(data)
      } catch {
        toast.error('Failed to load audit log')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const sorted = [...audit].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Audit Log</h1>
        <p className="mt-1 text-sm text-text-2">
          Full timestamped history of every action
        </p>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <EmptyState icon="📄" message="No audit entries yet." />
      ) : (
        <div className="overflow-x-auto rounded-r-2 border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-3">
                {['Invoice', 'Action', 'By', 'Note', 'Time'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => {
                const style = ACTION_STYLES[entry.action] || {
                  bg: 'bg-bg-3',
                  text: 'text-text-2',
                }
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border transition-colors hover:bg-bg-3/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-accent-2">
                      {entry.invoice_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          style.bg,
                          style.text
                        )}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{entry.done_by}</td>
                    <td className="px-4 py-3 text-sm text-text-2">
                      {entry.note || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2 whitespace-nowrap">
                      {fmtDate(entry.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
