import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import type { Invoice } from '../../lib/types'
import { fmtAmount } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceCard } from './InvoiceCard'
import { RejectModal } from './RejectModal'

export function InvoiceQueue() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null)
  const markedRef = useRef<Set<string>>(new Set())

  const fetchInvoices = useCallback(async () => {
    try {
      const data: Invoice[] = await api.get('/invoices')
      const pending = data.filter(
        (inv) => inv.status === 'submitted' || inv.status === 'im_review'
      )
      setInvoices(pending)

      // Auto-mark submitted invoices as im_review
      for (const inv of pending) {
        if (inv.status === 'submitted' && !markedRef.current.has(inv.id)) {
          markedRef.current.add(inv.id)
          api.patch('/invoices/' + inv.id + '/status', { status: 'im_review' }).catch(() => {
            markedRef.current.delete(inv.id)
          })
        }
      }
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  async function handleApprove(id: string) {
    try {
      await api.patch('/invoices/' + id + '/status', { status: 'im_approved' })
      toast.success('Invoice approved! Sent to Accounts ✅')
      fetchInvoices()
    } catch {
      toast.error('Failed to approve invoice')
    }
  }

  function handleRejectClick(id: string) {
    const inv = invoices.find((i) => i.id === id)
    if (inv) setRejectTarget(inv)
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return
    try {
      await api.patch('/invoices/' + rejectTarget.id + '/status', {
        status: 'rejected',
        rejection_note: reason,
      })
      toast.success('Invoice rejected. Creator notified 📧')
      setRejectTarget(null)
      fetchInvoices()
    } catch {
      toast.error('Failed to reject invoice')
    }
  }

  // Metrics
  const allInvoicesRef = useRef<Invoice[]>([])
  const [approvedThisMonth, setApprovedThisMonth] = useState(0)

  useEffect(() => {
    async function loadAll() {
      try {
        const data: Invoice[] = await api.get('/invoices')
        allInvoicesRef.current = data
        const now = new Date()
        const count = data.filter(
          (inv) =>
            (inv.status === 'im_approved' || inv.status === 'released') &&
            new Date(inv.updated_at).getMonth() === now.getMonth() &&
            new Date(inv.updated_at).getFullYear() === now.getFullYear()
        ).length
        setApprovedThisMonth(count)
      } catch {
        // silently fail for metrics
      }
    }
    loadAll()
  }, [])

  const pendingCount = invoices.length
  const totalPendingValue = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="animate-fade-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Invoice Queue</h1>
        <p className="mt-1 text-sm text-text-2">Invoices assigned to you for review</p>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon="⏳" value={pendingCount} label="Pending Review" />
        <MetricCard icon="✅" value={approvedThisMonth} label="Approved This Month" />
        <MetricCard icon="💰" value={fmtAmount(totalPendingValue)} label="Total Value Pending" />
      </div>

      {/* Invoice Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-r-2 border border-border bg-bg-2 py-16 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-3 text-sm text-text-2">No pending invoices in your queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onApprove={handleApprove}
              onReject={handleRejectClick}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        invoiceId={rejectTarget?.id ?? ''}
        creatorName={rejectTarget?.creator_name ?? ''}
        onConfirm={handleRejectConfirm}
      />
    </div>
  )
}
