import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import type { Invoice, AuditEntry } from '../../lib/types'
import { fmtAmount, timeAgo, cn } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { StatusBadge } from '../shared/StatusBadge'
import { InvoiceTable } from '../shared/InvoiceTable'
import { WorkloadBar } from '../shared/WorkloadBar'

const ACTION_DOT_COLORS: Record<string, string> = {
  'IM Approved': 'bg-green',
  'Payment Released': 'bg-green',
  Rejected: 'bg-red',
  Submitted: 'bg-blue',
  'Marked as IM Review': 'bg-amber',
  'Reminder sent': 'bg-accent',
}

export function AgencyView() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [invData, auditData] = await Promise.all([
          api.get('/invoices'),
          api.get('/audit'),
        ])
        setInvoices(invData)
        setAudit(auditData)
      } catch {
        toast.error('Failed to load dashboard data')
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

  const pendingIM = invoices.filter(
    (i) => i.status === 'submitted' || i.status === 'im_review'
  )
  const pendingPayments = invoices.filter((i) => i.status === 'im_approved')
  const payoutLiability = invoices
    .filter((i) => i.status !== 'released' && i.status !== 'rejected')
    .reduce((sum, i) => sum + i.amount + (i.gst ? i.amount * 0.18 : 0), 0)

  // IM workload
  const imCounts: Record<string, number> = {}
  invoices
    .filter((i) => i.status !== 'released' && i.status !== 'rejected')
    .forEach((i) => {
      if (i.assigned_im) {
        imCounts[i.assigned_im] = (imCounts[i.assigned_im] || 0) + 1
      }
    })
  const maxCount = Math.max(...Object.values(imCounts), 1)

  // Recent activity (last 6)
  const recentAudit = [...audit]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  // Table columns
  const columns = [
    { key: 'id', label: 'Invoice ID', render: (row: Invoice) => (
      <span className="font-medium text-accent-2">{row.id}</span>
    )},
    { key: 'creator_name', label: 'Creator' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'amount', label: 'Amount', render: (row: Invoice) => fmtAmount(row.amount) },
    { key: 'assigned_im', label: 'IM Member' },
    { key: 'status', label: 'Status', render: (row: Invoice) => <StatusBadge status={row.status} /> },
    { key: 'updated_at', label: 'Updated', render: (row: Invoice) => (
      <span className="text-text-2">{timeAgo(row.updated_at)}</span>
    )},
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Agency Dashboard</h1>
        <p className="mt-1 text-sm text-text-2">
          Full visibility across all invoices and team performance
        </p>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon="📥" value={pendingIM.length} label="Pending IM Approvals" />
        <MetricCard icon="💳" value={pendingPayments.length} label="Pending Payments" />
        <MetricCard icon="📋" value={invoices.length} label="Total Invoices" />
        <MetricCard icon="💰" value={fmtAmount(payoutLiability)} label="Payout Liability" />
      </div>

      {/* Two-column grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* IM Team Workload */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <h2 className="mb-4 font-serif text-base text-text">IM Team Workload</h2>
          {Object.keys(imCounts).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-3">No active assignments</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(imCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <WorkloadBar key={name} name={name} count={count} total={maxCount} />
                ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-r-2 border border-border bg-bg-2 p-5">
          <h2 className="mb-4 font-serif text-base text-text">Recent Activity</h2>
          {recentAudit.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-3">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentAudit.map((entry) => {
                const dotColor = ACTION_DOT_COLORS[entry.action] || 'bg-text-3'
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-text-3"> on </span>
                        <span className="text-accent-2">{entry.invoice_id}</span>
                      </p>
                      <p className="text-xs text-text-3">
                        {entry.done_by} · {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* All Invoices */}
      <div className="rounded-r-2 border border-border bg-bg-2 p-5">
        <h2 className="mb-4 font-serif text-base text-text">All Invoices</h2>
        <InvoiceTable columns={columns} data={invoices} />
      </div>
    </div>
  )
}
