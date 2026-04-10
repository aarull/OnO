import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { InvoicePdfActions } from '../shared/InvoicePdfActions'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'
import { api } from '../../lib/api'
import { invoiceHasStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import { fmtAmount, timeAgo } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { EmptyState } from '../shared/EmptyState'
import { ProcessModal } from './ProcessModal'

const isOverdue = (updatedAt: string) => {
  const diff = Date.now() - new Date(updatedAt).getTime()
  return diff > 3 * 24 * 60 * 60 * 1000
}

const isHold = (amount: number) => amount > 50000

function gstAmount(invoice: Invoice): number {
  return invoice.gst ? invoice.amount * 0.18 : 0
}

function totalWithGst(invoice: Invoice): number {
  return invoice.amount + gstAmount(invoice)
}

/** Poll interval when Supabase Realtime is not configured */
const POLL_MS = 45_000

export function PaymentQueue() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [timelineInvoice, setTimelineInvoice] = useState<Invoice | null>(null)

  const fetchInvoices = useCallback(async (silent = false) => {
    try {
      const data = await api.get('/invoices')
      setInvoices(Array.isArray(data) ? data : [])
    } catch {
      if (!silent) toast.error('Failed to load invoices')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | undefined

    void fetchInvoices(false)

    const client = supabase
    if (client) {
      const channel = client
        .channel('payment-queue-invoices')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
          },
          () => {
            if (!cancelled) void fetchInvoices(true)
          }
        )
        .subscribe()

      return () => {
        cancelled = true
        void client.removeChannel(channel)
      }
    }

    pollId = window.setInterval(() => {
      if (!cancelled) void fetchInvoices(true)
    }, POLL_MS)

    return () => {
      cancelled = true
      if (pollId !== undefined) window.clearInterval(pollId)
    }
  }, [fetchInvoices])

  const pending = invoices.filter((i) => invoiceHasStatus(i, 'im_approved'))
  const released = invoices.filter((i) => invoiceHasStatus(i, 'released'))
  const overdue = pending.filter((i) => isOverdue(i.updated_at))
  const totalLiability = pending.reduce((sum, i) => sum + totalWithGst(i), 0)

  function handleProcess(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setModalOpen(true)
  }

  async function handleConfirm(note: string) {
    if (!selectedInvoice) return
    try {
      await api.patch(`/invoices/${selectedInvoice.id}/status`, {
        status: 'released',
        note: note || undefined,
      })
      toast.success('Payment released successfully')
      setModalOpen(false)
      setSelectedInvoice(null)
      void fetchInvoices(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process payment')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <InvoiceDetailPanel
        invoiceId={timelineInvoice?.id ?? null}
        open={!!timelineInvoice}
        onClose={() => setTimelineInvoice(null)}
        backLabel="Back to payment queue"
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-text">Payment Queue</h1>
        <p className="mt-1 text-sm text-text-2">
          IM-approved invoices ready for processing
        </p>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon="⏳" value={pending.length} label="Pending Payments" />
        <MetricCard icon="💰" value={fmtAmount(totalLiability)} label="Total Liability" />
        <MetricCard icon="✅" value={released.length} label="Processed" />
        <MetricCard icon="🔴" value={overdue.length} label="Overdue >3 days" />
      </div>

      {/* Table */}
      {pending.length === 0 ? (
        <EmptyState icon="🎉" message="No pending payments!" />
      ) : (
        <div className="overflow-x-auto rounded-r-2 border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-3">
                {['Invoice ID', 'Creator', 'Campaign', 'Amount', 'Bank', 'IM Approved', 'Flag', 'Action'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-3"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => {
                const gst = gstAmount(inv)
                const overdueFlag = isOverdue(inv.updated_at)
                const holdFlag = isHold(totalWithGst(inv))

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border transition-colors hover:bg-bg-3/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-accent-2">
                      {inv.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{inv.creator_name}</td>
                    <td className="px-4 py-3 text-sm text-text">{inv.campaign}</td>
                    <td className="px-4 py-3 text-sm text-text">
                      {fmtAmount(inv.amount)}
                      {gst > 0 && (
                        <span className="ml-1 text-xs text-text-3">
                          +₹{gst.toLocaleString('en-IN')} GST
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2 font-mono">
                      <div className="max-w-[14rem] break-all">{inv.account_no}</div>
                      <div className="mt-0.5 text-xs text-text-3">{inv.ifsc}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2">
                      {timeAgo(inv.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {overdueFlag && (
                          <span className="inline-flex items-center rounded-full bg-red-bg px-2 py-0.5 text-[11px] font-medium text-red">
                            Overdue
                          </span>
                        )}
                        {holdFlag && (
                          <span className="inline-flex items-center rounded-full bg-amber-bg px-2 py-0.5 text-[11px] font-medium text-amber">
                            24h hold
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <InvoicePdfActions
                          invoice={inv}
                          onViewTimeline={setTimelineInvoice}
                        />
                        <button
                          type="button"
                          onClick={() => handleProcess(inv)}
                          className="rounded-r bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/25"
                        >
                          Process
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Process Modal */}
      <ProcessModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedInvoice(null)
        }}
        invoiceId={selectedInvoice?.id ?? ''}
        creatorName={selectedInvoice?.creator_name ?? ''}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
