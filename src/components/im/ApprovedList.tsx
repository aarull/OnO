import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo } from '../../lib/utils'
import { StatusBadge } from '../shared/StatusBadge'

export function ApprovedList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data: Invoice[] = await api.get('/invoices')
        const approved = data.filter(
          (inv) => inv.status === 'im_approved' || inv.status === 'released'
        )
        setInvoices(approved)
      } catch {
        toast.error('Failed to load invoices')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="animate-fade-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Approved Invoices</h1>
        <p className="mt-1 text-sm text-text-2">
          Invoices you've approved — now with Accounts
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-r-2 border border-border bg-bg-2 py-16 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-sm text-text-2">No approved invoices yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-r-2 border border-border bg-bg-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Invoice ID
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Creator
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Campaign
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Amount
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-3">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-bg-3">
                  <td className="px-5 py-4 font-mono text-xs text-accent-2">{inv.id}</td>
                  <td className="px-5 py-4 text-sm text-text">{inv.creator_name}</td>
                  <td className="px-5 py-4 text-sm text-text-2">{inv.campaign}</td>
                  <td className="px-5 py-4 text-sm font-medium text-text">
                    {fmtAmount(inv.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-text-3">{timeAgo(inv.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
