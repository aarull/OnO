import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { invoiceHasStatus, normalizeInvoiceStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceCard } from './InvoiceCard'
import { RejectModal } from './RejectModal'
import { FixResubmitAccountsModal } from './FixResubmitAccountsModal'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'

async function persistInvoiceUpdate(
  invoiceId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const client = supabase
  if (client) {
    const { error } = await client.from('invoices').update(fields).eq('id', invoiceId)
    if (error) throw new Error(error.message)
    return
  }
  await api.patch('/invoices/' + invoiceId + '/status', fields)
}

async function persistInvoiceFullUpdate(
  invoiceId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const client = supabase
  if (client) {
    const { error } = await client.from('invoices').update(fields).eq('id', invoiceId)
    if (error) throw new Error(error.message)
    return
  }

  // Use the known working route in this app.
  // Backend may accept extra fields like `base_amount` on this route.
  await api.patch('/invoices/' + encodeURIComponent(invoiceId) + '/status', fields)
}

async function persistResubmitAfterAuditFix(invoiceId: string): Promise<void> {
  await persistInvoiceUpdate(invoiceId, {
    status: 'im_approved',
    rejection_note: null,
  })
}

export function InvoiceQueue() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [rejectedInvoices, setRejectedInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null)
  const [payerCreatorRejectInvoice, setPayerCreatorRejectInvoice] = useState<Invoice | null>(null)
  const [fixResubmitInvoice, setFixResubmitInvoice] = useState<Invoice | null>(null)
  const [timelineInvoiceId, setTimelineInvoiceId] = useState<string | null>(null)
  const [resubmittingId, setResubmittingId] = useState<string | null>(null)
  const markedRef = useRef<Set<string>>(new Set())

  const fetchInvoices = useCallback(async () => {
    try {
      const data: Invoice[] = await api.get('/invoices')
      const pending = data.filter((inv) => {
        const s = normalizeInvoiceStatus(inv.status)
        return (
          s === 'submitted' ||
          s === 'im_review' ||
          s === 'payer_rejected_im'
        )
      })
      const rejected = data.filter((inv) => invoiceHasStatus(inv, 'audit_rejected'))
      setInvoices(pending)
      setRejectedInvoices(rejected)

      // Auto-mark submitted invoices as im_review
      for (const inv of pending) {
        if (normalizeInvoiceStatus(inv.status) === 'submitted' && !markedRef.current.has(inv.id)) {
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
      await persistInvoiceUpdate(id, { status: 'im_approved' })
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
      await persistInvoiceUpdate(rejectTarget.id, {
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

  async function handlePayerRejectToCreator(reason: string) {
    if (!payerCreatorRejectInvoice) return
    try {
      await persistInvoiceUpdate(payerCreatorRejectInvoice.id, {
        status: 'rejected',
        rejection_note: reason,
      })
      toast.success('Invoice returned to creator')
      setPayerCreatorRejectInvoice(null)
      fetchInvoices()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject invoice')
    }
  }

  async function handleFixResubmitAccountsSubmit(invoiceId: string, amount: number) {
    try {
      // TEMP: verify what we're sending (remove after confirming)
      console.log('Resubmitting with:', { id: invoiceId, updatedAmount: amount })

      await persistInvoiceFullUpdate(invoiceId, {
        status: 'im_approved',
        // Backend column is `base_amount` (API may also accept `amount`)
        base_amount: Number(amount),
        amount: Number(amount),
        rejection_note: null,
        final_payable_amount: null,
        tds_amount: null,
        tds_deducted: false,
      })
      toast.success('Base amount updated — returned to AP Auditor queue')
      setFixResubmitInvoice(null)
      fetchInvoices()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resubmit')
    }
  }

  async function handleFixResubmit(id: string) {
    setResubmittingId(id)
    try {
      await persistResubmitAfterAuditFix(id)
      setRejectedInvoices((prev) => prev.filter((i) => i.id !== id))
      toast.success('Invoice returned to Accounts queue for re-audit')
      void fetchInvoices()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resubmit invoice')
    } finally {
      setResubmittingId(null)
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
      <InvoiceDetailPanel
        invoiceId={timelineInvoiceId}
        open={!!timelineInvoiceId}
        onClose={() => setTimelineInvoiceId(null)}
        backLabel="Back to queue"
      />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Invoice Queue</h1>
        <p className="mt-1 text-sm text-text-2">Invoices assigned to you for review</p>
      </div>

      {rejectedInvoices.length > 0 && (
        <section
          className="mb-8 rounded-r-2 border border-red/25 bg-red-bg/30 p-5"
          aria-labelledby="accounts-rejected-heading"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="accounts-rejected-heading"
                className="font-serif text-lg text-text"
              >
                Rejected by Accounts
              </h2>
              <p className="mt-1 text-sm text-text-2">
                Requires attention — address the remark below, then resubmit to Accounts.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-amber/30 bg-amber-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber">
              Requires attention
            </span>
          </div>

          <div className="overflow-x-auto rounded-r-2 border border-border bg-bg-2/80">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-3">
                  {['Invoice', 'Creator', 'Campaign', 'Amount', 'Accounts rejection', 'Action'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-3"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rejectedInvoices.map((inv) => {
                  const remark =
                    inv.rejection_note?.trim() || 'No remark provided.'
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-bg-3/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-accent-2">{inv.id}</td>
                      <td className="px-4 py-3 text-text">{inv.creator_name}</td>
                      <td className="px-4 py-3 text-text-2">{inv.campaign}</td>
                      <td className="px-4 py-3 text-text">
                        {fmtAmount(Number(inv.amount))}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <div className="rounded-r border border-red/20 bg-red-bg/40 px-3 py-2 text-sm leading-relaxed text-red">
                          {remark}
                        </div>
                        <p className="mt-1 text-[11px] text-text-3">
                          Updated {timeAgo(inv.updated_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          disabled={resubmittingId === inv.id}
                          onClick={() => void handleFixResubmit(inv.id)}
                          className="rounded-r border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/25 disabled:opacity-50"
                        >
                          {resubmittingId === inv.id ? 'Submitting…' : 'Fix & Resubmit'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
              onRejectToCreator={(id) => {
                const row = invoices.find((i) => i.id === id)
                if (row) setPayerCreatorRejectInvoice(row)
              }}
              onFixResubmitAccounts={(i) => setFixResubmitInvoice(i)}
              onViewTimeline={(i) => setTimelineInvoiceId(i.id)}
            />
          ))}
        </div>
      )}

      {/* Reject Modal (standard IM review) */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        invoiceId={rejectTarget?.id ?? ''}
        creatorName={rejectTarget?.creator_name ?? ''}
        onConfirm={handleRejectConfirm}
      />

      {/* Reject to creator (payer-returned lane) */}
      <RejectModal
        open={!!payerCreatorRejectInvoice}
        onClose={() => setPayerCreatorRejectInvoice(null)}
        invoiceId={payerCreatorRejectInvoice?.id ?? ''}
        creatorName={payerCreatorRejectInvoice?.creator_name ?? ''}
        title="Reject to creator"
        confirmLabel="Reject to creator"
        reasonLabel="Remark for creator"
        onConfirm={handlePayerRejectToCreator}
      />

      <FixResubmitAccountsModal
        open={!!fixResubmitInvoice}
        invoice={fixResubmitInvoice}
        onClose={() => setFixResubmitInvoice(null)}
        onSubmit={handleFixResubmitAccountsSubmit}
      />
    </div>
  )
}
