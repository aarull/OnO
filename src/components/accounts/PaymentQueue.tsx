import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { InvoicePdfActions } from '../shared/InvoicePdfActions'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'
import { Modal } from '../shared/Modal'
import { api } from '../../lib/api'
import { invoiceHasStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import { cn, fmtAmount, timeAgo } from '../../lib/utils'
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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Poll interval when Supabase Realtime is not configured */
const POLL_MS = 45_000

async function persistInvoiceUpdate(invoiceId: string, fields: Record<string, unknown>): Promise<void> {
  const client = supabase
  if (client) {
    const { error } = await client.from('invoices').update(fields).eq('id', invoiceId)
    if (error) throw new Error(error.message)
    return
  }
  await api.patch(`/invoices/${invoiceId}/status`, fields)
}

interface AuditModalProps {
  invoice: Invoice | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function AuditModal({ invoice, open, onClose, onSuccess }: AuditModalProps) {
  const [applyTds, setApplyTds] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionRemark, setRejectionRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setApplyTds(false)
      setRejectMode(false)
      setRejectionRemark('')
      setSubmitting(false)
    }
  }, [open])

  if (!invoice) return null
  const inv = invoice

  const base = inv.amount
  const gst = gstAmount(inv)
  const tdsAmount = applyTds ? roundMoney(base * 0.01) : 0
  const finalPayable = roundMoney(base + gst - tdsAmount)

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleClearForPayment() {
    setSubmitting(true)
    try {
      await persistInvoiceUpdate(inv.id, {
        status: 'audit_cleared',
        tds_amount: tdsAmount,
        tds_deducted: applyTds,
        final_payable_amount: finalPayable,
      })
      toast.success('Cleared for payment')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear invoice')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmReject() {
    const remark = rejectionRemark.trim()
    if (!remark) {
      toast.error('Rejection remark is required')
      return
    }
    setSubmitting(true)
    try {
      await persistInvoiceUpdate(inv.id, {
        status: 'audit_rejected',
        rejection_note: remark,
      })
      toast.success('Invoice rejected at audit')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={rejectMode ? 'Reject invoice' : 'Audit invoice'}
      subtitle={
        rejectMode
          ? `${inv.id} · ${inv.creator_name}`
          : `${inv.id} · ${inv.creator_name} · ${inv.campaign}`
      }
      footer={
        rejectMode ? (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setRejectMode(false)}
              className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleConfirmReject()}
              className="rounded-r bg-red/15 px-4 py-2 text-sm font-medium text-red transition-colors hover:bg-red/25 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Confirm rejection'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setRejectMode(true)}
              className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleClearForPayment()}
              className="rounded-r bg-accent/20 px-4 py-2 text-sm font-medium text-accent-2 transition-colors hover:bg-accent/30 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Clear for payment'}
            </button>
          </>
        )
      }
    >
      {rejectMode ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">
            Rejection remark <span className="text-red">*</span>
          </label>
          <textarea
            value={rejectionRemark}
            onChange={(e) => setRejectionRemark(e.target.value)}
            placeholder="Explain why this invoice is being rejected…"
            rows={4}
            required
            className="w-full resize-none rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-r border border-border bg-bg-3/80 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4 text-text-2">
              <span>Base amount</span>
              <span className="font-medium text-text">{fmtAmount(base)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4 text-text-2">
              <span>GST {inv.gst ? '(18%)' : ''}</span>
              <span className="font-medium text-text">
                {gst > 0 ? fmtAmount(gst) : '—'}
              </span>
            </div>
            {applyTds && (
              <div className="mt-2 flex justify-between gap-4 text-text-2">
                <span>TDS (1% of base)</span>
                <span className="font-medium text-amber">−{fmtAmount(tdsAmount)}</span>
              </div>
            )}
            <div className="mt-3 border-t border-border pt-3 flex justify-between gap-4">
              <span className="font-medium text-text">Final payable</span>
              <span className="font-serif text-base font-medium text-accent-2">
                {fmtAmount(finalPayable)}
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-r border border-border bg-bg-3/50 px-4 py-3">
            <span className="text-sm text-text">Apply 1% TDS</span>
            <button
              type="button"
              role="switch"
              aria-checked={applyTds}
              onClick={() => setApplyTds((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border transition-colors',
                applyTds ? 'bg-accent/25' : 'bg-bg'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-text shadow-sm transition-transform',
                  applyTds ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </label>
        </div>
      )}
    </Modal>
  )
}

function AuditorQueue({
  invoices,
  onViewTimeline,
  onRefresh,
}: {
  invoices: Invoice[]
  onViewTimeline: (invoice: Invoice) => void
  onRefresh: () => void
}) {
  const [auditInvoice, setAuditInvoice] = useState<Invoice | null>(null)
  const queue = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'im_approved')),
    [invoices]
  )

  if (queue.length === 0) {
    return <EmptyState icon="📋" message="No invoices awaiting audit." />
  }

  return (
    <>
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
            {queue.map((inv) => {
              const gst = gstAmount(inv)
              const overdueFlag = isOverdue(inv.updated_at)
              const holdFlag = isHold(totalWithGst(inv))

              return (
                <tr
                  key={inv.id}
                  className="border-b border-border transition-colors hover:bg-bg-3/50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-accent-2">{inv.id}</td>
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
                  <td className="px-4 py-3 text-sm text-text-2">{timeAgo(inv.updated_at)}</td>
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
                      <InvoicePdfActions invoice={inv} onViewTimeline={onViewTimeline} />
                      <button
                        type="button"
                        onClick={() => setAuditInvoice(inv)}
                        className="rounded-r bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/25"
                      >
                        Audit
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AuditModal
        invoice={auditInvoice}
        open={!!auditInvoice}
        onClose={() => setAuditInvoice(null)}
        onSuccess={onRefresh}
      />
    </>
  )
}

function PayerQueue({
  invoices,
  onViewTimeline,
  onProcess,
}: {
  invoices: Invoice[]
  onViewTimeline: (invoice: Invoice) => void
  onProcess: (invoice: Invoice) => void
}) {
  const queue = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'audit_cleared')),
    [invoices]
  )

  if (queue.length === 0) {
    return <EmptyState icon="🎉" message="No invoices cleared for payment." />
  }

  return (
    <div className="overflow-x-auto rounded-r-2 border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-bg-3">
            {['Invoice ID', 'Creator', 'Campaign', 'Amount', 'Bank', 'Cleared', 'Flag', 'Action'].map(
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
          {queue.map((inv) => {
            const gst = gstAmount(inv)
            const hasFinal =
              inv.final_payable_amount != null && !Number.isNaN(Number(inv.final_payable_amount))
            const payableTotal = hasFinal ? Number(inv.final_payable_amount) : totalWithGst(inv)
            const overdueFlag = isOverdue(inv.updated_at)
            const holdFlag = isHold(payableTotal)

            return (
              <tr
                key={inv.id}
                className="border-b border-border transition-colors hover:bg-bg-3/50"
              >
                <td className="px-4 py-3 text-sm font-medium text-accent-2">{inv.id}</td>
                <td className="px-4 py-3 text-sm text-text">{inv.creator_name}</td>
                <td className="px-4 py-3 text-sm text-text">{inv.campaign}</td>
                <td className="px-4 py-3 text-sm text-text">
                  {hasFinal ? (
                    <span>
                      <span className="font-medium text-accent-2">
                        {fmtAmount(Number(inv.final_payable_amount))}
                      </span>
                      <span className="ml-1 block text-[11px] text-text-3">Final payable</span>
                    </span>
                  ) : (
                    <>
                      {fmtAmount(inv.amount)}
                      {gst > 0 && (
                        <span className="ml-1 text-xs text-text-3">
                          +₹{gst.toLocaleString('en-IN')} GST
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-2 font-mono">
                  <div className="max-w-[14rem] break-all">{inv.account_no}</div>
                  <div className="mt-0.5 text-xs text-text-3">{inv.ifsc}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-2">{timeAgo(inv.updated_at)}</td>
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
                    <InvoicePdfActions invoice={inv} onViewTimeline={onViewTimeline} />
                    <button
                      type="button"
                      onClick={() => onProcess(inv)}
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
  )
}

export function PaymentQueue() {
  const [activeRole, setActiveRole] = useState<'auditor' | 'payer'>('auditor')
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

    const pollId = window.setInterval(() => {
      if (!cancelled) void fetchInvoices(true)
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [fetchInvoices])

  const auditorPending = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'im_approved')),
    [invoices]
  )
  const payerPending = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'audit_cleared')),
    [invoices]
  )
  const released = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'released')),
    [invoices]
  )

  const pendingForRole = activeRole === 'auditor' ? auditorPending : payerPending
  const totalLiability = useMemo(() => {
    if (activeRole === 'auditor') {
      return auditorPending.reduce((sum, i) => sum + totalWithGst(i), 0)
    }
    return payerPending.reduce(
      (sum, i) => sum + (i.final_payable_amount ?? totalWithGst(i)),
      0
    )
  }, [activeRole, auditorPending, payerPending])

  const overdue = useMemo(
    () => pendingForRole.filter((i) => isOverdue(i.updated_at)),
    [pendingForRole]
  )

  function handleProcess(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setModalOpen(true)
  }

  async function handleConfirm(note: string) {
    const toRelease = selectedInvoice
    if (!toRelease) return
    try {
      await api.patch(`/invoices/${toRelease.id}/status`, {
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

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-text">Payment Queue</h1>
          <p className="mt-1 text-sm text-text-2">
            {activeRole === 'auditor'
              ? 'IM-approved invoices awaiting accounts audit'
              : 'Audit-cleared invoices ready for release'}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-bg-2 p-1"
          title="Dev: switch maker-checker role"
        >
          <button
            type="button"
            onClick={() => setActiveRole('auditor')}
            className={cn(
              'rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
              activeRole === 'auditor'
                ? 'bg-white/10 text-text'
                : 'text-text-3 hover:text-text-2'
            )}
          >
            AP Auditor
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('payer')}
            className={cn(
              'rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
              activeRole === 'payer'
                ? 'bg-white/10 text-text'
                : 'text-text-3 hover:text-text-2'
            )}
          >
            Final Payer
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon="⏳" value={pendingForRole.length} label="Pending Payments" />
        <MetricCard icon="💰" value={fmtAmount(totalLiability)} label="Total Liability" />
        <MetricCard icon="✅" value={released.length} label="Processed" />
        <MetricCard icon="🔴" value={overdue.length} label="Overdue >3 days" />
      </div>

      {activeRole === 'auditor' ? (
        <AuditorQueue
          invoices={invoices}
          onViewTimeline={setTimelineInvoice}
          onRefresh={() => void fetchInvoices(true)}
        />
      ) : (
        <PayerQueue
          invoices={invoices}
          onViewTimeline={setTimelineInvoice}
          onProcess={handleProcess}
        />
      )}

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
