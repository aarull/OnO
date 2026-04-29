import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { InvoicePdfActions } from '../shared/InvoicePdfActions'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'
import { Modal } from '../shared/Modal'
import { api } from '../../lib/api'
import { invoiceHasStatus, normalizeInvoiceStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import {
  adjustedNetFromInvoice,
} from '../../lib/invoicePayout'
import type { Invoice } from '../../lib/types'
import { cn, fmtAmount, roundMoney, timeAgo } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { EmptyState } from '../shared/EmptyState'
import { ProcessModal } from './ProcessModal'
import { ReleasePaymentModal, type PaymentReason } from './ReleasePaymentModal'

const isOverdue = (updatedAt: string) => {
  const diff = Date.now() - new Date(updatedAt).getTime()
  return diff > 3 * 24 * 60 * 60 * 1000
}

const isHold = (amount: number) => amount > 50000

function gstAmount(invoice: Invoice): number {
  const base = Number(invoice.amount)
  if (!Number.isFinite(base)) return 0
  return invoice.gst ? roundMoney(base * 0.18) : 0
}

function totalWithGst(invoice: Invoice): number {
  const base = Number(invoice.amount)
  if (!Number.isFinite(base)) return gstAmount(invoice)
  return roundMoney(base + gstAmount(invoice))
}

/** Poll interval when Supabase Realtime is not configured */
const POLL_MS = 10_000
/** Faster refresh on Final Payer tab so newly audit-cleared invoices appear quickly */
const PAYER_POLL_MS = 10_000

function isAuditClearedInvoice(inv: { status: string }): boolean {
  const s = normalizeInvoiceStatus(inv.status)
  return s === 'audit_cleared' || s === 'partially_paid'
}

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
  const [tdsRate, setTdsRate] = useState<number>(0)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionRemark, setRejectionRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setTdsRate(0)
      setRejectMode(false)
      setRejectionRemark('')
      setSubmitting(false)
    }
  }, [open])

  if (!invoice) return null
  const inv = invoice

  const base = inv.amount
  const gst = gstAmount(inv)
  const tdsAmount = tdsRate > 0 ? roundMoney((base * tdsRate) / 100) : 0
  const finalPayable = roundMoney(base - tdsAmount + gst)

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
        tds_deducted: tdsRate > 0,
        tds_percentage: tdsRate,
        final_payable_amount: finalPayable,
        rejection_note: null,
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
          {invoiceHasStatus(inv, 'payer_rejected_audit') && (
            <div className="rounded-r border border-amber/40 bg-amber/[0.08] px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber">
                Returned by payer — review remark
              </p>
              <p className="mt-2 leading-relaxed text-text">
                <span className="font-semibold text-amber">Payer remark: </span>
                {inv.rejection_note?.trim() || '—'}
              </p>
            </div>
          )}
          <div className="rounded-r border border-border bg-bg-3/80 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4 text-text-2">
              <span>Base amount</span>
              <span className="font-medium text-text">{fmtAmount(base)}</span>
            </div>
            {gst > 0 && (
              <div className="mt-2 flex justify-between gap-4 text-text-2">
                <span>GST (18%)</span>
                <span className="font-medium text-text-2">+{fmtAmount(gst)}</span>
              </div>
            )}
            {tdsRate > 0 && (
              <div className="mt-2 flex justify-between gap-4 text-text-2">
                <span>TDS ({tdsRate}% of base)</span>
                <span className="font-medium text-red">−{fmtAmount(tdsAmount)}</span>
              </div>
            )}
            <div className="mt-3 border-t border-border pt-3 flex justify-between gap-4">
              <span className="font-medium text-text">Final payable</span>
              <span className="font-serif text-base font-medium text-accent-2">
                {fmtAmount(finalPayable)}
              </span>
            </div>
          </div>

          <div className="rounded-r border border-border bg-bg-3/50 px-4 py-3">
            <p className="mb-2 text-sm text-text">TDS deduction</p>
            <div className="inline-flex w-full rounded-r border border-border bg-bg overflow-hidden">
              {([0, 1, 2, 10] as const).map((rate) => {
                const active = tdsRate === rate
                const label = rate === 0 ? 'None' : `${rate}%`
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTdsRate(rate)}
                    className={cn(
                      'flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                      'border-r border-border last:border-r-0',
                      active ? 'bg-white/10 text-text' : 'text-text-3 hover:text-text-2 hover:bg-bg-2/50'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-text-3">
              Deducted on base amount only. Final payable = Base − TDS + GST.
            </p>
          </div>
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
    () =>
      invoices.filter(
        (i) =>
          invoiceHasStatus(i, 'im_approved') || invoiceHasStatus(i, 'payer_rejected_audit')
      ),
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
              const overdueFlag = isOverdue(inv.updated_at)
              const holdFlag = isHold(totalWithGst(inv))
              const isPayerRejected = invoiceHasStatus(inv, 'payer_rejected_audit')
              const payerRemark = inv.rejection_note?.trim() ?? ''

              return (
                <Fragment key={inv.id}>
                  <tr
                    className={cn(
                      'cursor-pointer border-b border-border transition-colors hover:bg-bg-3/50',
                      isPayerRejected &&
                        'border-l-2 border-l-amber/55 bg-gradient-to-r from-amber/[0.08] from-0% to-transparent to-50% hover:from-amber/[0.11]'
                    )}
                    onClick={() => onViewTimeline(inv)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-accent-2">{inv.id}</td>
                    <td className="px-4 py-3 text-sm text-text">{inv.creator_name}</td>
                    <td className="px-4 py-3 text-sm text-text">{inv.campaign}</td>
                    <td className="px-4 py-3 text-sm text-text">
                      <span className="font-medium text-accent-2">
                        {fmtAmount(adjustedNetFromInvoice(inv))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2 font-mono">
                      <div className="max-w-[14rem] break-all">{inv.account_no}</div>
                      <div className="mt-0.5 text-xs text-text-3">{inv.ifsc}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2">{timeAgo(inv.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPayerRejected && (
                          <span className="inline-flex items-center rounded-full border border-amber/35 bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber">
                            Payer return
                          </span>
                        )}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            setAuditInvoice(inv)
                          }}
                          className="rounded-r bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/25"
                        >
                          Audit
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isPayerRejected && (
                    <tr
                      className={cn(
                        'border-b border-border border-l-2 border-l-amber/55 bg-red/[0.05]',
                        'hover:bg-red/[0.07]'
                      )}
                      onClick={() => onViewTimeline(inv)}
                    >
                      <td colSpan={8} className="px-4 py-3 pl-5">
                        <p className="text-sm leading-relaxed text-text">
                          <span className="font-semibold text-amber">Payer remark: </span>
                          <span className="text-text">
                            {payerRemark.length > 0 ? payerRemark : '—'}
                          </span>
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
  rejectingId,
  rejectReason,
  setRejectReason,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  rejectSubmitting,
}: {
  invoices: Invoice[]
  onViewTimeline: (invoice: Invoice) => void
  onProcess: (invoice: Invoice) => void
  rejectingId: string | null
  rejectReason: string
  setRejectReason: (next: string) => void
  onStartReject: (invoiceId: string) => void
  onCancelReject: () => void
  onConfirmReject: (invoiceId: string, status: 'payer_rejected_audit' | 'payer_rejected_im') => void
  rejectSubmitting: boolean
}) {
  const queue = useMemo(
    () => invoices.filter((i) => isAuditClearedInvoice(i)),
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
            const base = Number(inv.amount)
            const baseSafe = Number.isFinite(base) ? base : 0
            const gst = gstAmount(inv)
            const tds = Number(inv.tds_amount)
            const tdsSafe =
              inv.tds_amount != null && Number.isFinite(tds) && tds > 0 ? roundMoney(tds) : 0
            const computedFinal = roundMoney(roundMoney(baseSafe + gst) - tdsSafe)
            const hasFinal =
              inv.final_payable_amount != null && !Number.isNaN(Number(inv.final_payable_amount))
            /** Total contract before releases — API `final_payable_amount` when set */
            const contractTotalBeforePayments = hasFinal
              ? roundMoney(Number(inv.final_payable_amount))
              : computedFinal
            const amountPaid = Number(inv.amount_paid ?? 0)
            const amountPaidSafe = Number.isFinite(amountPaid) ? Math.max(0, amountPaid) : 0
            const pendingOutstanding = roundMoney(contractTotalBeforePayments - amountPaidSafe)
            const adjustedNet = adjustedNetFromInvoice(inv)
            const overdueFlag = isOverdue(inv.updated_at)
            const holdFlag = isHold(contractTotalBeforePayments)

            return (
              <Fragment key={inv.id}>
                <tr
                  className="cursor-pointer border-b border-border transition-colors hover:bg-bg-3/50"
                  onClick={() => onViewTimeline(inv)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-accent-2">{inv.id}</td>
                  <td className="px-4 py-3 text-sm text-text">{inv.creator_name}</td>
                  <td className="px-4 py-3 text-sm text-text">{inv.campaign}</td>
                  <td className="px-4 py-3 text-sm text-text">
                    {amountPaidSafe > 0 ? (
                      <div className="flex max-w-[16rem] gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold tracking-tight text-accent-2">
                              {fmtAmount(adjustedNet)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-amber/40 bg-amber-bg/30 px-2 py-0.5 text-[11px] font-medium text-amber">
                              Partially Paid
                            </span>
                          </div>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-text-3">
                            Pending • {fmtAmount(pendingOutstanding)} • {fmtAmount(amountPaidSafe)}{' '}
                            already paid
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex max-w-[16rem] gap-1.5">
                        <div className="min-w-0 flex-1">
                          <span className="text-lg font-semibold tracking-tight text-accent-2">
                            {fmtAmount(adjustedNet)}
                          </span>
                        </div>
                      </div>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartReject(inv.id)
                        }}
                        className="rounded-r border border-red/40 bg-red/10 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-red/20 disabled:opacity-50"
                        disabled={rejectSubmitting}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onProcess(inv)
                        }}
                        className="rounded-r bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/25"
                        disabled={rejectSubmitting}
                      >
                        Release Payment
                      </button>
                    </div>
                  </td>
                </tr>

                {rejectingId === inv.id && (
                  <tr className="border-b border-border">
                    <td colSpan={8} className="p-0">
                      <div className="relative h-64">
                        <div className="absolute inset-0 z-20 bg-[#1A1A1A] p-4 flex flex-col gap-3">
                          <div>
                            <p className="font-serif text-lg text-text">Reject payment</p>
                            <p className="mt-1 text-sm text-text-2">
                              Returning {inv.id} — {inv.creator_name}
                            </p>
                          </div>

                          <div className="flex flex-1 flex-col gap-2">
                            <label className="block text-sm font-medium text-text">
                              Rejection remark <span className="text-red">*</span>
                            </label>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Explain why payment is being rejected (visible to the receiving team)…"
                              className="w-full flex-grow resize-none rounded-r border border-gray-800 bg-[#141414] px-4 py-3 text-sm text-text placeholder:text-text-3 focus:border-amber/50 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={onCancelReject}
                              disabled={rejectSubmitting}
                              className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => onConfirmReject(inv.id, 'payer_rejected_audit')}
                              disabled={rejectSubmitting}
                              className="rounded-r border border-amber/45 bg-amber/10 px-4 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
                            >
                              {rejectSubmitting ? 'Saving…' : 'Reject to AP Auditor'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onConfirmReject(inv.id, 'payer_rejected_im')}
                              disabled={rejectSubmitting}
                              className="rounded-r border border-red/40 bg-red/10 px-4 py-2 text-sm font-medium text-red transition-colors hover:bg-red/20 disabled:opacity-50"
                            >
                              {rejectSubmitting ? 'Saving…' : 'Reject to IM team'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releaseInvoice, setReleaseInvoice] = useState<Invoice | null>(null)
  const [timelineInvoice, setTimelineInvoice] = useState<Invoice | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const fetchInvoices = useCallback(async (silent = false) => {
    try {
      // Cache-bust to ensure updated amounts show without hard refresh.
      const data = await api.get(`/invoices?ts=${Date.now()}`)
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

    return () => {
      cancelled = true
    }
  }, [fetchInvoices])

  useEffect(() => {
    let cancelled = false
    const pollMs = activeRole === 'payer' ? PAYER_POLL_MS : POLL_MS
    const pollId = window.setInterval(() => {
      if (!cancelled) void fetchInvoices(true)
    }, pollMs)
    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [fetchInvoices, activeRole])

  useEffect(() => {
    if (activeRole === 'payer') {
      void fetchInvoices(true)
    }
  }, [activeRole, fetchInvoices])

  useEffect(() => {
    function handleFocus() {
      void fetchInvoices(true)
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchInvoices])

  const auditorPending = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'im_approved')),
    [invoices]
  )
  const payerPending = useMemo(
    () => invoices.filter((i) => isAuditClearedInvoice(i)),
    [invoices]
  )
  const released = useMemo(
    () => invoices.filter((i) => invoiceHasStatus(i, 'released')),
    [invoices]
  )

  const pendingForRole = activeRole === 'auditor' ? auditorPending : payerPending
  const totalLiability = useMemo(() => {
    if (activeRole === 'auditor') {
      return auditorPending.reduce((sum, i) => sum + adjustedNetFromInvoice(i), 0)
    }
    return payerPending.reduce(
      (sum, i) => sum + (i.final_payable_amount ?? adjustedNetFromInvoice(i)),
      0
    )
  }, [activeRole, auditorPending, payerPending])

  const overdue = useMemo(
    () => pendingForRole.filter((i) => isOverdue(i.updated_at)),
    [pendingForRole]
  )

  function handleRelease(invoice: Invoice) {
    setReleaseInvoice(invoice)
    setReleaseOpen(true)
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

  async function handlePartialRelease(args: {
    invoice: Invoice
    amountToRelease: number
    paymentReason: PaymentReason
    noteToCreator: string
  }) {
    const inv = args.invoice
    try {
      await api.post(`/invoices/${encodeURIComponent(inv.id)}/release`, {
        amount_released: Number(args.amountToRelease),
        reason: args.paymentReason,
        note: args.noteToCreator || undefined,
      })
      toast.success('Payment released successfully')
      setReleaseOpen(false)
      setReleaseInvoice(null)
      void fetchInvoices(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to release payment')
      throw err
    }
  }

  async function handlePayerReject(
    status: 'payer_rejected_audit' | 'payer_rejected_im',
    remark: string
  ) {
    const inv = selectedInvoice
    if (!inv) return
    const trimmed = remark.trim()
    if (!trimmed) {
      toast.error('Rejection remark is required')
      return
    }

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? {
              ...i,
              status,
              rejection_note: trimmed,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )
    setModalOpen(false)
    setSelectedInvoice(null)

    try {
      await persistInvoiceUpdate(inv.id, {
        status,
        rejection_note: trimmed,
      })
      toast.success(
        status === 'payer_rejected_audit'
          ? 'Returned to AP Auditor for review'
          : 'Returned to IM team'
      )
      // Ensure the payer view immediately reflects cleaned/updated invoice data.
      void fetchInvoices(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject payment')
      void fetchInvoices(true)
    }
  }

  function startInlinePayerReject(invoiceId: string) {
    setRejectingId(invoiceId)
    setRejectReason('')
    setRejectSubmitting(false)
  }

  function cancelInlinePayerReject() {
    if (rejectSubmitting) return
    setRejectingId(null)
    setRejectReason('')
  }

  async function confirmInlinePayerReject(
    invoiceId: string,
    status: 'payer_rejected_audit' | 'payer_rejected_im'
  ) {
    const trimmed = rejectReason.trim()
    if (!trimmed) {
      toast.error('Rejection remark is required')
      return
    }

    setRejectSubmitting(true)
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              status,
              rejection_note: trimmed,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    try {
      await persistInvoiceUpdate(invoiceId, {
        status,
        rejection_note: trimmed,
      })
      toast.success(
        status === 'payer_rejected_audit'
          ? 'Returned to AP Auditor for review'
          : 'Returned to IM team'
      )
      setRejectingId(null)
      setRejectReason('')
      void fetchInvoices(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject payment')
      void fetchInvoices(true)
    } finally {
      setRejectSubmitting(false)
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
          onProcess={handleRelease}
          rejectingId={rejectingId}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onStartReject={startInlinePayerReject}
          onCancelReject={cancelInlinePayerReject}
          onConfirmReject={(invoiceId, status) => void confirmInlinePayerReject(invoiceId, status)}
          rejectSubmitting={rejectSubmitting}
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
        onRejectPayout={handlePayerReject}
      />

      <ReleasePaymentModal
        open={releaseOpen}
        invoice={releaseInvoice}
        onClose={() => {
          setReleaseOpen(false)
          setReleaseInvoice(null)
        }}
        onSubmit={handlePartialRelease}
      />
    </div>
  )
}
