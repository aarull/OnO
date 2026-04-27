import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { normalizeInvoiceStatus } from '../../lib/invoiceStatus'
import { supabase } from '../../lib/supabase'
import type { Invoice } from '../../lib/types'
import { adjustedNetFromInvoice } from '../../lib/invoicePayout'
import { fmtAmount } from '../../lib/utils'
import { MetricCard } from '../shared/MetricCard'
import { InvoiceCard } from './InvoiceCard'
import { RejectModal } from './RejectModal'
import { FixResubmitAccountsModal } from './FixResubmitAccountsModal'
import { InvoiceDetailPanel } from '../shared/InvoiceDetailPanel'
import { Button } from '../shared/Button'

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
  try {
    await api.patch('/invoices/' + encodeURIComponent(invoiceId) + '/status', fields)
  } catch {
    // Some deployments may expose POST instead of PATCH for status updates.
    await api.post('/invoices/' + encodeURIComponent(invoiceId) + '/status', fields)
  }
}

function normalizeInvoiceIds(invoices: Invoice[]): Invoice[] {
  return invoices.map((inv) => {
    const anyInv = inv as unknown as Record<string, unknown>
    const id = typeof inv.id === 'string' ? inv.id.trim() : ''
    const looksLikeDisplayNumber = /^INV-\d{4}-\d+/i.test(id)
    if (!looksLikeDisplayNumber) return inv

    const pkCandidate =
      (typeof anyInv.invoice_id === 'string' && anyInv.invoice_id.trim()) ||
      (typeof anyInv.invoice_uuid === 'string' && anyInv.invoice_uuid.trim()) ||
      (typeof anyInv.uuid === 'string' && anyInv.uuid.trim()) ||
      (typeof anyInv.db_id === 'string' && anyInv.db_id.trim()) ||
      ''

    if (!pkCandidate) return inv

    // Force `invoice.id` to be the DB PK (UUID) so all URL templates use UUIDs.
    // Preserve the display number in `invoice_number` for UI/WhatsApp copy.
    return {
      ...inv,
      id: pkCandidate,
      invoice_number: inv.invoice_number ?? id,
    }
  })
}

export function InvoiceQueue() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null)
  const [payerCreatorRejectInvoice, setPayerCreatorRejectInvoice] = useState<Invoice | null>(null)
  const [fixResubmitInvoice, setFixResubmitInvoice] = useState<Invoice | null>(null)
  const [timelineInvoiceId, setTimelineInvoiceId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveRemark, setApproveRemark] = useState('')
  const [approveSubmitting, setApproveSubmitting] = useState(false)
  const markedRef = useRef<Set<string>>(new Set())

  const fetchInvoices = useCallback(async () => {
    try {
      const data: Invoice[] = await api.get('/invoices')
      const normalized = normalizeInvoiceIds(Array.isArray(data) ? data : [])
      const pending = normalized.filter((inv) => {
        const s = normalizeInvoiceStatus(inv.status)
        return (
          s === 'submitted' ||
          s === 'im_review' ||
          s === 'payer_rejected_im' ||
          s === 'audit_rejected'
        )
      })
      setInvoices(pending)

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

  async function handleApproveConfirm(id: string) {
    const remark = approveRemark.trim()
    try {
      setApproveSubmitting(true)
      await persistInvoiceUpdate(id, {
        status: 'im_approved',
        im_remark: remark.length > 0 ? remark : null,
      })
      toast.success('Invoice approved! Sent to Accounts ✅')
      setApprovingId(null)
      setApproveRemark('')
      fetchInvoices()
    } catch {
      toast.error('Failed to approve invoice')
    } finally {
      setApproveSubmitting(false)
    }
  }

  function handleApproveClick(id: string) {
    setApprovingId(id)
    setApproveRemark('')
    setApproveSubmitting(false)
  }

  function closeApproveOverlay() {
    if (approveSubmitting) return
    setApprovingId(null)
    setApproveRemark('')
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
    const cleaned = reason.trim()
    try {
      await persistInvoiceUpdate(payerCreatorRejectInvoice.id, {
        status: 'rejected',
        // overwrite any previous remark (incl. audit remark) when returning to creator
        rejection_note: cleaned.length > 0 ? cleaned : null,
      })
      toast.success('Invoice returned to creator')
      setPayerCreatorRejectInvoice(null)
      fetchInvoices()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject invoice')
    }
  }

  async function handleFixResubmitAccountsSubmit(invoice: Invoice, amount: number) {
    try {
      const uuid = invoice.id
      if (typeof uuid === 'string' && uuid.startsWith('INV-')) {
        console.error('ERROR: Still using Display Number instead of UUID')
      }

      // TEMP: verify what we're sending (remove after confirming)
      console.log('Resubmitting with:', {
        invoice_number: invoice.invoice_number,
        id: invoice.id,
        uuid,
        updatedAmount: amount,
      })

      // STRICT: backend expects UUID/PK in `invoice.id` (never invoice_number).
      await persistInvoiceFullUpdate(uuid, {
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
  const totalPendingValue = invoices.reduce((sum, inv) => sum + adjustedNetFromInvoice(inv), 0)

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
          {invoices.map((invoice) => (
            <div key={invoice.id} className="relative overflow-hidden">
              <InvoiceCard
                invoice={invoice}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                onRejectToCreator={(id) => {
                  const row = invoices.find((i) => i.id === id)
                  if (row) setPayerCreatorRejectInvoice(row)
                }}
                onFixResubmitAccounts={(i) => setFixResubmitInvoice(i)}
                onViewTimeline={(i) => setTimelineInvoiceId(i.id)}
              />

              {approvingId === invoice.id && (
                <div className="absolute inset-0 z-10 flex flex-col justify-between bg-[#1A1A1A]/95 p-5 backdrop-blur">
                  <div className="space-y-4">
                    <div>
                      <p className="font-serif text-lg text-text">Approve Invoice</p>
                      <p className="mt-1 text-sm text-text-2">
                        Approving {invoice.invoice_number ?? invoice.id} for {invoice.creator_name}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-text">
                        Add a custom note or remark for the Accounts team{' '}
                        <span className="text-text-3">(Optional)</span>
                      </label>
                      <textarea
                        value={approveRemark}
                        onChange={(e) => setApproveRemark(e.target.value)}
                        placeholder="e.g. All details verified, proceed with payout."
                        rows={4}
                        className="w-full resize-none rounded-r border border-gray-800 bg-[#141414] px-4 py-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeApproveOverlay}
                      disabled={approveSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="green"
                      size="sm"
                      onClick={() => void handleApproveConfirm(invoice.id)}
                      disabled={approveSubmitting}
                    >
                      {approveSubmitting ? 'Approving…' : 'Confirm Approval'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
